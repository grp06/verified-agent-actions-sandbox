import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RepoInspection } from "@/lib/demo-types";

export type CodexIssueDraft = {
  title: string;
  reason: string;
  body: string;
};

const STDERR_LIMIT_BYTES = 64 * 1024;
const CODEX_COMMAND = "codex";
const CODEX_REASONING_EFFORT = "none";
const CODEX_TIMEOUT_MS = 25_000;

const ISSUE_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "reason", "body"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      maxLength: 120,
    },
    reason: {
      type: "string",
      minLength: 1,
      maxLength: 240,
    },
    body: {
      type: "string",
      minLength: 1,
      maxLength: 4000,
    },
  },
};

type CodexSettings = {
  command: string;
  reasoningEffort: string;
  timeoutMs: number;
};

const CODEX_SETTINGS: CodexSettings = {
  command: CODEX_COMMAND,
  reasoningEffort: CODEX_REASONING_EFFORT,
  timeoutMs: CODEX_TIMEOUT_MS,
};

function getMinimalCodexEnv() {
  const allowedKeys = [
    "CODEX_API_KEY",
    "CODEX_HOME",
    "HOME",
    "LANG",
    "LC_ALL",
    "OPENAI_API_KEY",
    "PATH",
    "SHELL",
    "TERM",
    "USER",
  ];

  const env: Record<string, string> = {};

  for (const key of allowedKeys) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  return env;
}

function getCodexArgs({
  outputPath,
  runDirectory,
  schemaPath,
  settings,
}: {
  outputPath: string;
  runDirectory: string;
  schemaPath: string;
  settings: CodexSettings;
}) {
  const args = [
    "--cd",
    runDirectory,
    "--sandbox",
    "read-only",
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-rules",
    "--json",
    "--color",
    "never",
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    "-c",
    `model_reasoning_effort="${settings.reasoningEffort}"`,
    "-c",
    'model_reasoning_summary="none"',
    "-c",
    'shell_environment_policy.inherit="none"',
  ];

  args.push("-");
  return args;
}

function appendWithLimit(current: string, chunk: Buffer) {
  if (current.length >= STDERR_LIMIT_BYTES) {
    return current;
  }

  return (current + chunk.toString("utf8")).slice(0, STDERR_LIMIT_BYTES);
}

async function runCodexExec({
  prompt,
  runDirectory,
  schemaPath,
  outputPath,
  settings,
}: {
  prompt: string;
  runDirectory: string;
  schemaPath: string;
  outputPath: string;
  settings: CodexSettings;
}) {
  const args = getCodexArgs({
    outputPath,
    runDirectory,
    schemaPath,
    settings,
  });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(settings.command, args, {
      cwd: runDirectory,
      env: getMinimalCodexEnv() as NodeJS.ProcessEnv,
      shell: false,
      stdio: ["pipe", "ignore", "pipe"],
    });
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, settings.timeoutMs);

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendWithLimit(stderr, chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);

      if (didTimeout) {
        reject(new Error(`Codex CLI timed out after ${settings.timeoutMs} ms.`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      const status = signal ? `signal ${signal}` : `code ${code}`;
      const details = stderr.trim();
      reject(
        new Error(
          `Codex CLI exited with ${status}${details ? `: ${details}` : ""}.`,
        ),
      );
    });

    child.stdin.end(prompt);
  });
}

function parseIssueDraftJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Codex issue draft was not valid JSON.");
  }
}

function asIssueDraft(value: unknown): CodexIssueDraft {
  if (!value || typeof value !== "object") {
    throw new Error("Codex response was not an object.");
  }

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const reason =
    typeof candidate.reason === "string" ? candidate.reason.trim() : "";
  const body = typeof candidate.body === "string" ? candidate.body.trim() : "";

  if (!title || !reason || !body) {
    throw new Error("Codex response was missing title, reason, or body.");
  }

  const combined = `${title}\n${reason}\n${body}`;

  if (!/background/i.test(combined) || !/\bwhite\b/i.test(combined)) {
    throw new Error("Codex response did not describe the white background issue.");
  }

  return { title, reason, body };
}

function buildPrompt(inspection: RepoInspection) {
  const issueTitles = inspection.issues
    .slice(0, 5)
    .map((issue) => `- #${issue.number}: ${issue.title}`)
    .join("\n");

  return `You are the issue-drafting agent for a local Auth0/GitHub demo.

Task:
Draft exactly one GitHub issue suggesting a simple app improvement: change the app background color to white.

Important boundaries:
- Do not modify files.
- Do not create issues.
- Do not request secrets or tokens.
- Do not call tools or run commands.
- Return JSON only.

Repo facts from the authenticated app:
- Repository: ${inspection.repo.full_name}
- Default branch: ${inspection.repo.default_branch}
- README present: ${inspection.readmeFound ? "yes" : "no"}
- Open non-PR issue count: ${inspection.issues.length}
- Connected GitHub user: ${inspection.githubUser.login}

Existing issue titles:
${issueTitles || "- none"}

Return this JSON shape:
{
  "title": "Change the app background to white",
  "reason": "One sentence explaining why this tiny change is a safe demo issue.",
  "body": "Markdown issue body with Suggested change and Acceptance criteria sections."
}
`;
}

async function writeSchema(schemaPath: string) {
  await writeFile(schemaPath, JSON.stringify(ISSUE_DRAFT_SCHEMA, null, 2));
}

async function draftIssue(inspection: RepoInspection) {
  const runDirectory = await mkdtemp(path.join(tmpdir(), "verified-agent-"));
  const schemaPath = path.join(runDirectory, "issue-draft.schema.json");
  const outputPath = path.join(runDirectory, "issue-draft.json");

  try {
    await writeSchema(schemaPath);
    await runCodexExec({
      prompt: buildPrompt(inspection),
      runDirectory,
      schemaPath,
      outputPath,
      settings: CODEX_SETTINGS,
    });

    const finalMessage = await readFile(outputPath, "utf8").catch(() => "");

    if (!finalMessage.trim()) {
      throw new Error("Codex did not write an issue draft.");
    }

    return asIssueDraft(parseIssueDraftJson(finalMessage));
  } finally {
    await rm(runDirectory, { recursive: true, force: true });
  }
}

export async function draftIssueWithCodex(
  inspection: RepoInspection,
): Promise<CodexIssueDraft | null> {
  try {
    return await draftIssue(inspection);
  } catch (error) {
    console.warn(
      "Codex issue draft failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
