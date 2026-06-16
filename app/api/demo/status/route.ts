import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { DEMO_TARGET_OWNER, DEMO_TARGET_REPO } from "@/lib/demo-config";
import { getGitHubUser } from "@/lib/github";

export async function GET() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      githubConnected: false,
    });
  }

  try {
    const githubUser = await getGitHubUser();

    return NextResponse.json({
      authenticated: true,
      githubConnected: true,
      user: session.user,
      githubUser,
      target: {
        owner: DEMO_TARGET_OWNER,
        repo: DEMO_TARGET_REPO,
      },
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: true,
      githubConnected: false,
      user: session.user,
      connectError: error instanceof Error ? error.message : null,
      target: {
        owner: DEMO_TARGET_OWNER,
        repo: DEMO_TARGET_REPO,
      },
    });
  }
}
