import { auth0, getAuth0IssuerBaseUrl, getMyAccountAudience } from "@/lib/auth0";

type ConnectedAccount = {
  id: string;
  connection: string;
};

type ConnectedAccountsPayload =
  | ConnectedAccount[]
  | {
      accounts?: ConnectedAccount[];
      data?: ConnectedAccount[];
    };

function getConnectedAccountsBaseUrl() {
  const issuerBaseUrl = getAuth0IssuerBaseUrl();

  if (!issuerBaseUrl) {
    throw new Error("AUTH0_DOMAIN is required to manage connected accounts.");
  }

  return new URL("/me/v1/connected-accounts/accounts", issuerBaseUrl);
}

function getAccountsFromPayload(payload: ConnectedAccountsPayload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.accounts ?? payload.data ?? [];
}

async function getConnectedAccountsToken(scope: string) {
  const audience = getMyAccountAudience();

  if (!audience) {
    throw new Error("AUTH0_DOMAIN is required to request My Account API tokens.");
  }

  const { token } = await auth0.getAccessToken({
    audience,
    scope,
  });

  return token;
}

async function parseErrorBody(response: Response) {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const body = (await response.json()) as {
      error?: string;
      error_description?: string;
      message?: string;
    };

    return body.error_description ?? body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function disconnectGitHubConnectedAccounts() {
  const baseUrl = getConnectedAccountsBaseUrl();
  const readToken = await getConnectedAccountsToken("read:me:connected_accounts");
  const listResponse = await fetch(baseUrl, {
    headers: {
      Authorization: `Bearer ${readToken}`,
    },
  });

  if (!listResponse.ok) {
    throw new Error(
      `Unable to list connected accounts: ${await parseErrorBody(listResponse)}`,
    );
  }

  const payload = (await listResponse.json()) as ConnectedAccountsPayload;
  const githubAccounts = getAccountsFromPayload(payload).filter(
    (account) => account.connection === "github",
  );

  if (githubAccounts.length === 0) {
    return { disconnected: 0 };
  }

  const deleteToken = await getConnectedAccountsToken(
    "delete:me:connected_accounts",
  );

  await Promise.all(
    githubAccounts.map(async (account) => {
      const deleteUrl = new URL(
        `${baseUrl.pathname}/${encodeURIComponent(account.id)}`,
        baseUrl,
      );
      const deleteResponse = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${deleteToken}`,
        },
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        throw new Error(
          `Unable to delete connected GitHub account: ${await parseErrorBody(deleteResponse)}`,
        );
      }
    }),
  );

  return { disconnected: githubAccounts.length };
}
