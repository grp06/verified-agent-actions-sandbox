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

const timelineBase = [
  "Auth0 identifies the signed-in user.",
  "GitHub is connected through Auth0 Token Vault.",
  "The app requests a GitHub token server-side.",
  "The agent inspects the sandbox repo.",
  "The user reviews the exact write action.",
];

const loginHref =
  "/auth/login?connection=Username-Password-Authentication";
const connectGitHubHref = "/vault/github";

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
        throw new Error(data.error ?? "Unable to create an agent plan.");
      }

      setPlanResponse(data as PlanResponse);
      await loadStatus();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create a plan.",
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  const approveAction = async () => {
    if (!planResponse) {
      setError("Run the agent before approving an action.");
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

  const targetLabel = status?.target
    ? `${status.target.owner}/${status.target.repo}`
    : "Sandbox repo";

  const timeline = useMemo(() => {
    const finalStep = approvalResponse
      ? approvalResponse.result.status === "already-exists"
          ? "Existing demo issue found; no duplicate was created."
          : "Approved issue was created in GitHub."
      : "Approval is still pending.";

    return [...timelineBase, finalStep];
  }, [approvalResponse]);

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
              A GitHub issue agent that authenticates the user, retrieves
              delegated GitHub access through Auth0 Token Vault, and asks before
              it writes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!status ? (
              <StatusPill tone="zinc">Checking</StatusPill>
            ) : (
              <StatusPill tone="zinc">Sandbox only</StatusPill>
            )}
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
                : "Connect GitHub through Auth0 Token Vault before running the agent."}
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
              Writes are allowlisted to this repo and rechecked on the server
              before every approval.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-5 w-5" />
                  Agent plan
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  The agent inspects the repo, drafts an issue, then waits.
                </p>
              </div>
              <IconButton
                disabled={!user || !status?.githubConnected || busyAction === "plan"}
                onClick={runAgent}
              >
                <Play className="h-4 w-4" />
                {busyAction === "plan" ? "Running..." : "Run agent"}
              </IconButton>
            </div>

            {planResponse ? (
              <div className="mt-5 space-y-5">
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
                  <p className="text-sm font-semibold">Proposed write</p>
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
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Connect GitHub, then run the agent to generate the approval
                payload.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-semibold">Audit timeline</h2>
              <ol className="mt-4 space-y-3">
                {timeline.map((item, index) => (
                  <li className="flex gap-3 text-sm" key={item}>
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      {index + 1}
                    </span>
                    <span className="leading-6 text-zinc-700 dark:text-zinc-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {approvalResponse ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
                <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                  Approval result
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                  {approvalResponse.result.status === "already-exists"
                      ? "The demo issue already exists, so the app did not create a duplicate."
                      : "The approved GitHub issue was created."}
                </p>
                {"issue" in approvalResponse.result ? (
                  <a
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-900 underline underline-offset-4 dark:text-emerald-100"
                    href={approvalResponse.result.issue.html_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View issue #{approvalResponse.result.issue.number}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
