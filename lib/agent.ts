import { DEMO_MARKER, getDemoConfig } from "@/lib/demo-config";
import { draftIssueWithCodex, type CodexIssueDraft } from "@/lib/codex-agent";
import type { AgentPlan, RepoInspection } from "@/lib/demo-types";

function getFallbackIssueDraft(): CodexIssueDraft {
  return {
    title: "Change the app background to white",
    reason:
      "A tiny visual change is easy to review, safe for the sandbox, and keeps the demo focused on approval instead of code complexity.",
    body: `## Suggested change

Update the app background to white so the demo has a cleaner, simpler visual baseline.

## Acceptance criteria

- The main app background is white.
- Text remains readable with accessible contrast.
- Authentication, GitHub connection, and approval behavior are unchanged.
`,
  };
}

function buildObservations(
  inspection: RepoInspection,
  draftedWithCodex: boolean,
) {
  const openDemoIssue = inspection.issues.find((issue) =>
    issue.body?.includes(DEMO_MARKER),
  );

  return [
    `${inspection.githubUser.login} connected GitHub through Auth0 Token Vault.`,
    `${inspection.repo.full_name} is the configured sandbox repository.`,
    inspection.readmeFound
      ? "README.md is present in the sandbox repository."
      : "README.md is missing in the sandbox repository.",
    openDemoIssue
      ? `A previous demo issue already exists as #${openDemoIssue.number}.`
      : `${inspection.issues.length} open non-PR issues were found before this run.`,
    draftedWithCodex
      ? "Codex CLI drafted the proposed issue text from sanitized repo facts."
      : "The deterministic fallback drafted the issue because Codex was unavailable.",
  ];
}

function withDemoMarker(body: string) {
  const withoutMarker = body.replace(DEMO_MARKER, "").trim();
  return `${DEMO_MARKER}

${withoutMarker}
`;
}

export async function buildIssuePlan(
  inspection: RepoInspection,
): Promise<AgentPlan> {
  const config = getDemoConfig();
  const codexDraft = await draftIssueWithCodex(inspection);
  const draft = codexDraft ?? getFallbackIssueDraft();

  return {
    id: `issue:${config.targetOwner}/${config.targetRepo}:background-white`,
    action: "create_issue",
    owner: config.targetOwner,
    repo: config.targetRepo,
    title: draft.title,
    reason: draft.reason,
    endpoint: `POST /repos/${config.targetOwner}/${config.targetRepo}/issues`,
    observations: buildObservations(inspection, Boolean(codexDraft)),
    body: withDemoMarker(draft.body),
  };
}
