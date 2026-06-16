import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { disconnectGitHubConnectedAccounts } from "@/lib/connected-accounts";

export async function GET(request: Request) {
  const logoutUrl = new URL("/auth/logout", request.url);
  const returnTo = new URL(request.url).searchParams.get("returnTo");

  if (returnTo) {
    logoutUrl.searchParams.set("returnTo", returnTo);
  }

  const session = await auth0.getSession();

  if (session) {
    try {
      await disconnectGitHubConnectedAccounts();
    } catch (error) {
      console.warn(
        "Unable to disconnect GitHub before logout",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return NextResponse.redirect(logoutUrl);
}
