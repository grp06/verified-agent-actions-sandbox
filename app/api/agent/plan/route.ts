import { NextResponse } from "next/server";

import { buildIssuePlan } from "@/lib/agent";
import { inspectTargetRepo, isGitHubConnectionRequired } from "@/lib/github";
import { signAgentPlan } from "@/lib/plan-token";
import { isAuthenticationRequired, requireUserSub } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userSub = await requireUserSub();
    const inspection = await inspectTargetRepo();
    const plan = await buildIssuePlan(inspection);
    const planToken = signAgentPlan(plan, userSub);

    return NextResponse.json({ inspection, plan, planToken });
  } catch (error) {
    if (isAuthenticationRequired(error)) {
      return NextResponse.json(
        {
          code: "authentication_required",
          error: "Log in before running the starter flow.",
        },
        { status: 401 },
      );
    }

    if (isGitHubConnectionRequired(error)) {
      return NextResponse.json(
        {
          code: "github_connection_required",
          error: "Connect GitHub before running the starter flow.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create a plan.",
      },
      { status: 500 },
    );
  }
}
