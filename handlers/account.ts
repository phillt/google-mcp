import {
  initiateOAuthFlowForAccount,
  createAuthClientForAccount,
  removeAccountTokens,
} from "../utils/auth";
import {
  isAccountAuthenticateArgs,
  isAccountListArgs,
  isAccountSetDefaultArgs,
  isAccountRemoveArgs,
} from "../utils/helper";
import { AccountRegistry } from "../utils/account-registry";

export async function handleAccountAuthenticate(
  args: any,
  registry: AccountRegistry
) {
  if (!isAccountAuthenticateArgs(args)) {
    throw new Error("Invalid arguments for google_account_authenticate");
  }

  try {
    const email = await initiateOAuthFlowForAccount(registry.getTokensDir());

    // Create auth client and add to registry
    const authClient = await createAuthClientForAccount(email, registry.getTokensDir());
    registry.addAccount(email, authClient);

    const isDefault = registry.getDefaultAccountId() === email;
    return {
      content: [
        {
          type: "text",
          text: `Successfully authenticated account: ${email}${isDefault ? " (set as default)" : ""}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to authenticate account: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleAccountList(
  args: any,
  registry: AccountRegistry
) {
  if (!isAccountListArgs(args)) {
    throw new Error("Invalid arguments for google_account_list");
  }

  const accounts = registry.listAccounts();

  if (accounts.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No Google accounts are authenticated. Use google_account_authenticate to add an account.",
        },
      ],
      isError: false,
    };
  }

  const lines = accounts.map(
    (a) => `- ${a.email}${a.isDefault ? " (default)" : ""}`
  );

  return {
    content: [
      {
        type: "text",
        text: `Authenticated accounts:\n${lines.join("\n")}`,
      },
    ],
    isError: false,
  };
}

export async function handleAccountSetDefault(
  args: any,
  registry: AccountRegistry
) {
  if (!isAccountSetDefaultArgs(args)) {
    throw new Error(
      "Invalid arguments for google_account_set_default. Required: accountId (string)"
    );
  }

  try {
    registry.setDefault(args.accountId);
    return {
      content: [
        {
          type: "text",
          text: `Default account set to: ${args.accountId}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to set default account: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleAccountRemove(
  args: any,
  registry: AccountRegistry
) {
  if (!isAccountRemoveArgs(args)) {
    throw new Error(
      "Invalid arguments for google_account_remove. Required: accountId (string)"
    );
  }

  try {
    const removed = registry.removeAccount(args.accountId);
    if (!removed) {
      return {
        content: [
          {
            type: "text",
            text: `Account "${args.accountId}" not found.`,
          },
        ],
        isError: true,
      };
    }

    removeAccountTokens(args.accountId, registry.getTokensDir());

    const newDefault = registry.getDefaultAccountId();
    let message = `Account "${args.accountId}" removed.`;
    if (newDefault) {
      message += ` Default account is now: ${newDefault}`;
    }

    return {
      content: [{ type: "text", text: message }],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to remove account: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
