"use client";

import {
  CheckCircle2,
  ExternalLink,
  FolderGit,
  GitBranch,
  LogIn,
  LogOut,
  Play,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import type {
  ApprovalResponse,
  DemoStatus,
  PlanResponse,
} from "@/lib/demo-types";

const loginHref =
  "/auth/login?connection=Username-Password-Authentication";
const connectGitHubHref = "/vault/github";

type TimelineStep = {
  complete: boolean;
  label: string;
};

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "zinc";
  children: React.ReactNode;
}) {
  const classes = {
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  };

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  href,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const base =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary:
      "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
    danger:
      "border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950",
  };

  if (href) {
    return (
      <a className={`${base} ${variants[variant]}`} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={`${base} ${variants[variant]}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TimelineMarker({
  complete,
  current,
  index,
}: {
  complete: boolean;
  current: boolean;
  index: number;
}) {
  if (complete) {
    return (
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
        current
          ? "border-amber-400 text-amber-700 dark:border-amber-300 dark:text-amber-200"
          : "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500"
      }`}
    >
      {index + 1}
    </span>
  );
}

export default function Home() {
  const { user, isLoading } = useUser();
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [planResponse, setPlanResponse] = useState<PlanResponse | null>(null);
  const [approvalResponse, setApprovalResponse] =
    useState<ApprovalResponse | null>(null);
  const [busyAction, setBusyAction] = useState<"status" | "plan" | "approve">();
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setBusyAction("status");
    setError(null);
    try {
      const response = await fetch("/api/demo/status");
      const data = (await response.json()) as DemoStatus;
      setStatus(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load demo status.",
      );
    } finally {
      setBusyAction(undefined);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus, user]);

  const runAgent = async () => {
    setBusyAction("plan");
    setError(null);
    setApprovalResponse(null);

    try {
      const response = await fetch("/api/agent/plan", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to run the starter flow.");
      }

      setPlanResponse(data as PlanResponse);
      await loadStatus();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to run the starter flow.",
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  const approveAction = async () => {
    if (!planResponse) {
      setError("Run the starter flow before approving an action.");
      return;
    }

    setBusyAction("approve");
    setError(null);

    try {
      const response = await fetch("/api/agent/approve", {
        body: JSON.stringify({ planToken: planResponse.planToken }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to approve the action.");
      }

      setApprovalResponse(data as ApprovalResponse);
      await loadStatus();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to approve action.",
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  const targetLabel = status?.githubConnected && status.target
    ? `${status.target.owner}/${status.target.repo}`
    : "Connect GitHub first";

  const timeline = useMemo(() => {
    const issueResult = approvalResponse
      ? approvalResponse.result.status === "already-exists"
        ? "Existing demo issue found; no duplicate was created."
        : "Approved issue was created in GitHub."
      : "GitHub issue result recorded.";

    return [
      {
        complete: Boolean(user),
        label: "Signed in with Auth0.",
      },
      {
        complete: Boolean(status?.githubConnected),
        label: "GitHub connected through Token Vault.",
      },
      {
        complete: Boolean(planResponse?.inspection),
        label: "Sandbox repo inspected.",
      },
      {
        complete: Boolean(planResponse?.plan),
        label: "Agent proposed an exact write.",
      },
      {
        complete: Boolean(approvalResponse),
        label: "User approved the action.",
      },
      {
        complete: Boolean(approvalResponse),
        label: issueResult,
      },
    ] satisfies TimelineStep[];
  }, [approvalResponse, planResponse, status?.githubConnected, user]);

  const currentTimelineIndex = timeline.findIndex((step) => !step.complete);
  const isCompleted = Boolean(approvalResponse);
  const approvalMessage =
    approvalResponse?.result.status === "already-exists"
      ? "The approved issue already exists, so no duplicate was created."
      : "The approved issue was created in GitHub.";
  const approvedIssue =
    approvalResponse && "issue" in approvalResponse.result
      ? approvalResponse.result.issue
      : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4" />
              Auth0 for AI Agents demo
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Verified Agent Actions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              A tiny starter kit for agents that need permission before they
              act.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <IconButton href="/logout" variant="secondary">
                <LogOut className="h-4 w-4" />
                Log out
              </IconButton>
            ) : (
              <IconButton href={loginHref}>
                <LogIn className="h-4 w-4" />
                Log in
              </IconButton>
            )}
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Auth0 session</h2>
              {isLoading || busyAction === "status" ? (
                <StatusPill tone="zinc">Checking</StatusPill>
              ) : user ? (
                <StatusPill tone="green">Signed in</StatusPill>
              ) : (
                <StatusPill tone="amber">Required</StatusPill>
              )}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {user
                ? user.email || user.name || "Authenticated user"
                : "Log in first so the agent has a user to act for."}
            </p>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">GitHub connection</h2>
              {status?.githubConnected ? (
                <StatusPill tone="green">Connected</StatusPill>
              ) : (
                <StatusPill tone="amber">Not connected</StatusPill>
              )}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {status?.githubUser
                ? `Acting as ${status.githubUser.login}`
                : "Connect GitHub through Auth0 Token Vault before running the starter flow."}
            </p>
            {user && !status?.githubConnected ? (
              <div className="mt-4">
                <IconButton href={connectGitHubHref} variant="secondary">
                  <FolderGit className="h-4 w-4" />
                  Connect GitHub
                </IconButton>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Sandbox target</h2>
              <StatusPill tone="zinc">{targetLabel}</StatusPill>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {status?.githubConnected
                ? "Writes are allowlisted to this repo and rechecked on the server before every approval."
                : "The sandbox target appears after GitHub is connected."}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {isCompleted ? "Action completed" : "Agent Approval Flow"}
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {isCompleted
                    ? approvalMessage
                    : "A starter flow where Auth0 connects GitHub, the agent proposes a write, and the user approves it."}
                </p>
              </div>
              {isCompleted ? (
                <IconButton
                  onClick={() => {
                    setApprovalResponse(null);
                    setPlanResponse(null);
                  }}
                  variant="secondary"
                >
                  <Play className="h-4 w-4" />
                  Run again
                </IconButton>
              ) : (
                <IconButton
                  disabled={
                    !user || !status?.githubConnected || busyAction === "plan"
                  }
                  onClick={runAgent}
                >
                  <Play className="h-4 w-4" />
                  {busyAction === "plan" ? "Running..." : "Run starter flow"}
                </IconButton>
              )}
            </div>

            {planResponse ? (
              <div className="mt-5 space-y-5">
                {isCompleted ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                    <p className="text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                      {approvalMessage}
                    </p>
                    {approvedIssue ? (
                      <a
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-900 underline underline-offset-4 dark:text-emerald-100"
                        href={approvedIssue.html_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View issue #{approvedIssue.number}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    <GitBranch className="h-4 w-4" />
                    {planResponse.inspection.repo.full_name}
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Default branch
                      </dt>
                      <dd className="font-medium">
                        {planResponse.inspection.repo.default_branch}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        README
                      </dt>
                      <dd className="font-medium">
                        {planResponse.inspection.readmeFound
                          ? "Found"
                          : "Missing"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Open issues
                      </dt>
                      <dd className="font-medium">
                        {planResponse.inspection.issues.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {isCompleted ? "Approved write" : "Proposed write"}
                  </p>
                  <div className="mt-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                    <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      {planResponse.plan.endpoint}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {planResponse.plan.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {planResponse.plan.reason}
                    </p>
                    <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
                      {planResponse.plan.body}
                    </pre>
                  </div>
                </div>

                {!isCompleted ? (
                  <div className="flex flex-wrap gap-3">
                    <IconButton
                      disabled={busyAction === "approve"}
                      onClick={approveAction}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {busyAction === "approve"
                        ? "Approving..."
                        : "Approve issue creation"}
                    </IconButton>
                    <IconButton
                      disabled={busyAction === "approve"}
                      onClick={() => {
                        setApprovalResponse(null);
                        setPlanResponse(null);
                      }}
                      variant="danger"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </IconButton>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Connect GitHub, then run the starter flow to see an agent ask
                for approval before it writes.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-semibold">Audit timeline</h2>
              <ol className="mt-4 space-y-3">
                {timeline.map((step, index) => (
                  <li className="flex gap-3 text-sm" key={step.label}>
                    <TimelineMarker
                      complete={step.complete}
                      current={index === currentTimelineIndex}
                      index={index}
                    />
                    <span
                      className={`leading-6 ${
                        step.complete
                          ? "text-zinc-900 dark:text-zinc-100"
                          : index === currentTimelineIndex
                            ? "text-zinc-800 dark:text-zinc-200"
                            : "text-zinc-500 dark:text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
