import { Auth0Client } from "@auth0/nextjs-auth0/server";

const AUTH0_SCOPE =
  "openid profile email offline_access create:me:connected_accounts read:me:connected_accounts delete:me:connected_accounts";

export function getAuth0IssuerBaseUrl() {
  const domain = process.env.AUTH0_DOMAIN;

  if (!domain) {
    return undefined;
  }

  const origin = domain.startsWith("https://") ? domain : `https://${domain}`;
  return `${origin.replace(/\/+$/, "")}/`;
}

export function getMyAccountAudience() {
  const issuerBaseUrl = getAuth0IssuerBaseUrl();

  if (!issuerBaseUrl) {
    return undefined;
  }

  return new URL("/me/", issuerBaseUrl).toString();
}

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: getMyAccountAudience(),
    scope: AUTH0_SCOPE,
  },
});
