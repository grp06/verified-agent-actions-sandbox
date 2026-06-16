import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { getDemoConfig } from "@/lib/demo-config";
import { getGitHubUser } from "@/lib/github";

export async function GET() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      githubConnected: false,
    });
  }

  const config = getDemoConfig();

  try {
    const githubUser = await getGitHubUser();

    return NextResponse.json({
      authenticated: true,
      githubConnected: true,
      dryRun: config.dryRun,
      user: session.user,
      githubUser,
      target: {
        owner: config.targetOwner,
        repo: config.targetRepo,
      },
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: true,
      githubConnected: false,
      dryRun: config.dryRun,
      user: session.user,
      connectError: error instanceof Error ? error.message : null,
      target: {
        owner: config.targetOwner,
        repo: config.targetRepo,
      },
    });
  }
}
