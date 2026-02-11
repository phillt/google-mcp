import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import type { Credentials } from "google-auth-library";
import { startOAuthServer } from "./oauth-server";
import open from "open";

function saveTokensToFile(tokens: Credentials, tokenPath: string): void {
  // Normalize the path to ensure proper handling on all platforms
  const normalizedPath = path.normalize(tokenPath);

  // Ensure the directory exists
  const dirname = path.dirname(normalizedPath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  fs.writeFileSync(normalizedPath, JSON.stringify(tokens));
}

function loadTokensFromFile(tokenPath: string): Credentials {
  try {
    // Normalize the path
    const normalizedPath = path.normalize(tokenPath);
    return JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Error loading token file: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

// --- Multi-account token directory helpers ---

export function getTokensDir(): string {
  if (process.env.GOOGLE_OAUTH_TOKENS_DIR) {
    return path.normalize(process.env.GOOGLE_OAUTH_TOKENS_DIR);
  }
  if (process.env.GOOGLE_OAUTH_TOKEN_PATH) {
    const parent = path.dirname(path.normalize(process.env.GOOGLE_OAUTH_TOKEN_PATH));
    return path.join(parent, "google-mcp-tokens");
  }
  return path.join(process.env.HOME || process.env.USERPROFILE || ".", "google-mcp-tokens");
}

export async function getUserEmail(authClient: any): Promise<string> {
  const oauth2 = google.oauth2({ version: "v2", auth: authClient });
  const res = await oauth2.userinfo.get();
  const email = res.data.email;
  if (!email) {
    throw new Error("Could not determine user email from OAuth token. Ensure the userinfo.email scope is granted.");
  }
  return email;
}

export function saveAccountTokens(tokens: Credentials, email: string, tokensDir: string): void {
  const normalizedDir = path.normalize(tokensDir);
  if (!fs.existsSync(normalizedDir)) {
    fs.mkdirSync(normalizedDir, { recursive: true });
  }
  const tokenPath = path.join(normalizedDir, `${email}.json`);
  fs.writeFileSync(tokenPath, JSON.stringify(tokens));
}

export function loadAccountTokens(email: string, tokensDir: string): Credentials {
  const tokenPath = path.join(path.normalize(tokensDir), `${email}.json`);
  try {
    return JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Error loading tokens for account ${email}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export function listStoredAccounts(tokensDir: string): string[] {
  const normalizedDir = path.normalize(tokensDir);
  if (!fs.existsSync(normalizedDir)) {
    return [];
  }
  return fs
    .readdirSync(normalizedDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function removeAccountTokens(email: string, tokensDir: string): void {
  const tokenPath = path.join(path.normalize(tokensDir), `${email}.json`);
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3001";

  if (!clientId || !clientSecret) {
    throw new Error(
      "OAuth client ID and secret are required in environment variables"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function createOAuth2Client(): any {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function createAuthClientForAccount(email: string, tokensDir: string): Promise<any> {
  const tokens = loadAccountTokens(email, tokensDir);
  const oAuth2Client = createOAuth2Client();
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function initiateOAuthFlowForAccount(tokensDir: string): Promise<string> {
  const oAuth2Client = createOAuth2Client();

  // Start the OAuth server with custom callback
  let resolveEmail: (email: string) => void;
  let rejectEmail: (err: Error) => void;
  const emailPromise = new Promise<string>((resolve, reject) => {
    resolveEmail = resolve;
    rejectEmail = reject;
  });

  const serverPromise = startOAuthServer(async (code: string) => {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Get user email
      const email = await getUserEmail(oAuth2Client);

      // Save tokens to directory
      saveAccountTokens(tokens, email, tokensDir);

      resolveEmail!(email);
    } catch (err) {
      rejectEmail!(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  });

  // Generate and open the consent URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: DEFAULT_SCOPES,
    prompt: "consent",
  });
  await open(authUrl);

  // Wait for the server to complete the flow
  await serverPromise;

  return emailPromise;
}

export async function refreshAccountTokens(email: string, tokensDir: string): Promise<{ credentials: Credentials; message: string }> {
  const currentTokens = loadAccountTokens(email, tokensDir);

  if (!currentTokens.refresh_token) {
    throw new Error(`No refresh token available for ${email}. Please re-authenticate.`);
  }

  const oAuth2Client = createOAuth2Client();
  oAuth2Client.setCredentials(currentTokens);

  const { credentials } = await oAuth2Client.refreshAccessToken();

  const updatedTokens = {
    ...currentTokens,
    ...credentials,
    refresh_token: credentials.refresh_token || currentTokens.refresh_token,
  };

  saveAccountTokens(updatedTokens, email, tokensDir);

  const message = `Tokens refreshed for ${email}. New expiry: ${
    credentials.expiry_date
      ? new Date(credentials.expiry_date).toLocaleString()
      : "Unknown"
  }`;

  return { credentials: updatedTokens, message };
}

export async function migrateTokenFile(tokensDir: string): Promise<string | null> {
  const legacyTokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH
    ? path.normalize(process.env.GOOGLE_OAUTH_TOKEN_PATH)
    : undefined;

  if (!legacyTokenPath || !fs.existsSync(legacyTokenPath)) {
    return null;
  }

  // Check if it's a file (not a directory) and hasn't been migrated
  const stat = fs.statSync(legacyTokenPath);
  if (!stat.isFile()) {
    return null;
  }

  try {
    const tokens = loadTokensFromFile(legacyTokenPath);

    // Try to determine email from the token
    const oAuth2Client = createOAuth2Client();
    oAuth2Client.setCredentials(tokens);

    let email: string;
    try {
      email = await getUserEmail(oAuth2Client);
    } catch {
      // If we can't get the email (e.g., missing scope), use a fallback name
      email = "default";
    }

    // Check if already migrated (token file already exists in directory)
    const existingAccounts = listStoredAccounts(tokensDir);
    if (existingAccounts.includes(email)) {
      return email;
    }

    // Save to new directory
    saveAccountTokens(tokens, email, tokensDir);

    // Rename the original file to .migrated.bak
    fs.renameSync(legacyTokenPath, legacyTokenPath + ".migrated.bak");

    return email;
  } catch (err) {
    // Migration failed silently — will fall through to normal init
    return null;
  }
}

// --- Legacy functions (kept for backward compatibility) ---

export async function createAuthClient(): Promise<any> {
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthTokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH
    ? path.normalize(process.env.GOOGLE_OAUTH_TOKEN_PATH)
    : undefined;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3001";

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (oauthClientId && oauthClientSecret && oauthTokenPath) {
    const oAuth2Client = new google.auth.OAuth2(
      oauthClientId,
      oauthClientSecret,
      redirectUri
    );

    try {
      const tokens = loadTokensFromFile(oauthTokenPath);
      oAuth2Client.setCredentials(tokens);
      return oAuth2Client;
    } catch (error) {
      // Tokens not found or invalid, initiate OAuth flow and wait for completion
      await initiateOAuthFlow();
      // After flow completes, load the newly saved tokens
      const tokens = loadTokensFromFile(oauthTokenPath);
      oAuth2Client.setCredentials(tokens);
      return oAuth2Client;
    }
  } else {
    // Fallback to service account
    if (!clientEmail || !privateKey) {
      throw new Error(
        "Authentication failed: Neither OAuth nor Service Account credentials are properly configured in environment variables."
      );
    }
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/tasks",
      ],
      subject: process.env.GMAIL_USER_TO_IMPERSONATE,
    });
  }
}

export async function initiateOAuthFlow(scopes?: string[]): Promise<void> {
  try {
    // Start the OAuth server to handle the callback
    const serverPromise = startOAuthServer();

    // Generate and open the consent URL
    const authUrl = generateOAuthConsentUrl(scopes);
    await open(authUrl);

    // Wait for the server to complete the flow
    await serverPromise;
  } catch (error) {
    throw error;
  }
}

export function generateOAuthConsentUrl(scopes?: string[]): string {
  const oAuth2Client = createOAuth2Client();

  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes || DEFAULT_SCOPES,
    prompt: "consent",
  });
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH;

  if (!tokenPath) {
    throw new Error(
      "OAuth client ID, secret, and token path are required in environment variables"
    );
  }

  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  saveTokensToFile(tokens, tokenPath);
}

export async function refreshTokens(): Promise<string> {
  const oauthTokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH
    ? path.normalize(process.env.GOOGLE_OAUTH_TOKEN_PATH)
    : undefined;

  if (!oauthTokenPath) {
    throw new Error(
      "OAuth token path is required for token refresh"
    );
  }

  try {
    // Load existing tokens
    const currentTokens = loadTokensFromFile(oauthTokenPath);

    if (!currentTokens.refresh_token) {
      throw new Error("No refresh token available. Please re-authenticate.");
    }

    const oAuth2Client = createOAuth2Client();
    oAuth2Client.setCredentials(currentTokens);

    // Refresh the access token
    const { credentials } = await oAuth2Client.refreshAccessToken();

    // Update tokens in file (preserve refresh_token if not returned)
    const updatedTokens = {
      ...currentTokens,
      ...credentials,
      refresh_token: credentials.refresh_token || currentTokens.refresh_token,
    };

    saveTokensToFile(updatedTokens, oauthTokenPath);

    return `Tokens refreshed successfully. New expiry: ${
      credentials.expiry_date
        ? new Date(credentials.expiry_date).toLocaleString()
        : "Unknown"
    }`;
  } catch (error) {
    throw new Error(
      `Failed to refresh tokens: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function reauthenticate(): Promise<string> {
  const oauthTokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH
    ? path.normalize(process.env.GOOGLE_OAUTH_TOKEN_PATH)
    : undefined;

  if (!oauthTokenPath) {
    throw new Error("OAuth token path is required for re-authentication");
  }

  try {
    // Delete existing token file if it exists
    if (fs.existsSync(oauthTokenPath)) {
      fs.unlinkSync(oauthTokenPath);
    }

    // Initiate fresh OAuth flow
    await initiateOAuthFlow();

    return "Re-authentication completed successfully. New tokens have been saved.";
  } catch (error) {
    throw new Error(
      `Failed to re-authenticate: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
