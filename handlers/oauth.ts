import {
  refreshAccountTokens,
  removeAccountTokens,
  initiateOAuthFlowForAccount,
  createAuthClientForAccount,
} from "../utils/auth";
import { isRefreshTokensArgs, isReauthenticateArgs } from "../utils/helper";
import { AccountRegistry } from "../utils/account-registry";

export async function handleOauthRefreshTokens(
  args: any,
  registry: AccountRegistry
) {
  if (!isRefreshTokensArgs(args)) {
    throw new Error("Invalid arguments for google_oauth_refresh_tokens");
  }

  try {
    const accountId = args.accountId;

    const tokensDir = registry.getTokensDir();
    const { message } = await refreshAccountTokens(accountId, tokensDir);

    // Re-initialize services with new tokens
    const authClient = await createAuthClientForAccount(accountId, tokensDir);
    registry.addAccount(accountId, authClient);

    return {
      content: [
        {
          type: "text",
          text: message + "\nServices re-initialized with refreshed tokens.",
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to refresh tokens: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleOauthReauthenticate(
  args: any,
  registry: AccountRegistry
) {
  if (!isReauthenticateArgs(args)) {
    throw new Error("Invalid arguments for google_oauth_reauthenticate");
  }

  try {
    const accountId = args.accountId;
    const tokensDir = registry.getTokensDir();

    // Remove existing tokens
    removeAccountTokens(accountId, tokensDir);
    registry.removeAccount(accountId);

    // Initiate fresh OAuth flow
    const email = await initiateOAuthFlowForAccount(tokensDir);

    // Create auth client and add to registry
    const authClient = await createAuthClientForAccount(email, tokensDir);
    registry.addAccount(email, authClient);

    return {
      content: [
        {
          type: "text",
          text: `Re-authentication completed for ${email}. Services re-initialized with fresh authentication.`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to re-authenticate: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
