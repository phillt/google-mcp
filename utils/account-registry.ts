import GoogleCalendar from "./calendar";
import GoogleGmail from "./gmail";
import GoogleDrive from "./drive";
import GoogleTasks from "./tasks";
import GoogleSheets from "./sheets";
import GoogleDocs from "./docs";
import {
  createAuthClientForAccount,
  listStoredAccounts,
} from "./auth";

export interface ServiceBundle {
  authClient: any;
  calendar: GoogleCalendar;
  gmail: GoogleGmail;
  drive: GoogleDrive;
  tasks: GoogleTasks;
  sheets: GoogleSheets;
  docs: GoogleDocs;
}

export class AccountRegistry {
  private accounts: Map<string, ServiceBundle> = new Map();
  private defaultAccountId: string | null = null;
  private tokensDir: string;

  constructor(tokensDir: string) {
    this.tokensDir = tokensDir;
  }

  getTokensDir(): string {
    return this.tokensDir;
  }

  getServiceBundle(accountId: string): ServiceBundle {
    if (!this.hasAccounts()) {
      throw new Error(
        "No Google accounts are authenticated. Use google_account_authenticate to add an account."
      );
    }

    const bundle = this.accounts.get(accountId);
    if (!bundle) {
      const available = Array.from(this.accounts.keys()).join(", ");
      throw new Error(
        `Account "${accountId}" not found. Available accounts: ${available}`
      );
    }

    return bundle;
  }

  addAccount(email: string, authClient: any): void {
    const bundle: ServiceBundle = {
      authClient,
      calendar: new GoogleCalendar(authClient),
      gmail: new GoogleGmail(authClient),
      drive: new GoogleDrive(authClient),
      tasks: new GoogleTasks(authClient),
      sheets: new GoogleSheets(authClient),
      docs: new GoogleDocs(authClient),
    };

    this.accounts.set(email, bundle);

    // Set as default if it's the first account
    if (this.accounts.size === 1) {
      this.defaultAccountId = email;
    }
  }

  removeAccount(email: string): boolean {
    const deleted = this.accounts.delete(email);
    if (!deleted) return false;

    // Reassign default if the removed account was the default
    if (this.defaultAccountId === email) {
      const remaining = Array.from(this.accounts.keys());
      this.defaultAccountId = remaining.length > 0 ? remaining[0] : null;
    }

    return true;
  }

  listAccounts(): { email: string; isDefault: boolean }[] {
    return Array.from(this.accounts.keys()).map((email) => ({
      email,
      isDefault: email === this.defaultAccountId,
    }));
  }

  setDefault(email: string): void {
    if (!this.accounts.has(email)) {
      const available = Array.from(this.accounts.keys()).join(", ");
      throw new Error(
        `Account "${email}" not found. Available accounts: ${available}`
      );
    }
    this.defaultAccountId = email;
  }

  getDefaultAccountId(): string | null {
    return this.defaultAccountId;
  }

  hasAccounts(): boolean {
    return this.accounts.size > 0;
  }

  async loadAllAccounts(): Promise<void> {
    const emails = listStoredAccounts(this.tokensDir);
    let failedCount = 0;
    for (const email of emails) {
      try {
        const authClient = await createAuthClientForAccount(email, this.tokensDir);
        this.addAccount(email, authClient);
      } catch (err) {
        failedCount++;
        // Skip accounts that fail to load (e.g., expired tokens with no refresh token)
        console.error(`Failed to load account ${email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (emails.length > 0 && !this.hasAccounts()) {
      console.warn(
        `All ${failedCount} stored account(s) failed to load. Use google_account_authenticate to re-authenticate.`
      );
    }
  }
}
