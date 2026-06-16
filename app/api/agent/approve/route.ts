import { NextResponse } from "next/server";

import {
  createIssueAfterApproval,
  inspectTargetRepo,
  isGitHubConnectionRequired,
} from "@/lib/github";
import { PlanTokenError, verifyAgentPlanToken } from "@/lib/plan-token";
import { isAuthenticationRequired, requireUserSub } from "@/lib/session";

export const runtime = "nodejs";

type ApprovalRequestBody = {
  planToken?: unknown;
};

async function getRequestBody(request: Request) {
  try {
    return (await request.json()) as ApprovalRequestBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const userSub = await requireUserSub();
    const body = await getRequestBody(request);

    if (typeof body.planToken !== "string") {
      return NextResponse.json(
        {
          code: "approval_token_required",
          error: "Run the agent again before approving the action.",
        },
        { status: 400 },
      );
    }

    const plan = verifyAgentPlanToken(body.planToken, userSub);

    await inspectTargetRepo();

    const result = await createIssueAfterApproval(
      plan.owner,
      plan.repo,
      plan.title,
      plan.body,
    );

    return NextResponse.json({ plan, result });
  } catch (error) {
    if (isAuthenticationRequired(error)) {
      return NextResponse.json(
        {
          code: "authentication_required",
          error: "Log in before approving the action.",
        },
        { status: 401 },
      );
    }

    if (error instanceof PlanTokenError) {
      return NextResponse.json(
        {
          code: "approval_token_invalid",
          error: "Run the agent again before approving the action.",
        },
        { status: 400 },
      );
    }

    if (isGitHubConnectionRequired(error)) {
      return NextResponse.json(
        {
          code: "github_connection_required",
          error: "Connect GitHub before approving the action.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to approve action.",
      },
      { status: 500 },
    );
  }
}
