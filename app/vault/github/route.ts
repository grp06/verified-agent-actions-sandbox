import {
  ConnectAccountError,
  ConnectAccountErrorCodes,
} from "@auth0/nextjs-auth0/errors";
import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

function getConnectErrorDetails(error: unknown) {
  if (error instanceof ConnectAccountError) {
    return {
      code: error.code,
      message: error.message,
      status: error.cause?.status ?? 500,
      cause: error.cause
        ? {
            title: error.cause.title,
            detail: error.cause.detail,
            status: error.cause.status,
          }
        : undefined,
    };
  }

  return {
    code: "github_connect_failed",
    message:
      error instanceof Error
        ? error.message
        : "Unable to start the GitHub connection.",
    status: 500,
  };
}

export async function GET(request: Request) {
  try {
    return await auth0.connectAccount({
      connection: "github",
      returnTo: "/",
    });
  } catch (error) {
    const details = getConnectErrorDetails(error);

    if (
      error instanceof ConnectAccountError &&
      error.code === ConnectAccountErrorCodes.MISSING_SESSION
    ) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("connection", "Username-Password-Authentication");
      loginUrl.searchParams.set("returnTo", "/");
      return NextResponse.redirect(loginUrl);
    }

    console.warn("GitHub connected-account flow failed", details);

    return NextResponse.json(
      {
        code: details.code,
        error: details.message,
      },
      {
        status: details.status,
      },
    );
  }
}
