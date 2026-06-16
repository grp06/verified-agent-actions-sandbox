import { Octokit } from "octokit";

import { auth0 } from "@/lib/auth0";
import {
  DEMO_MARKER,
  DEMO_TARGET_OWNER,
  DEMO_TARGET_REPO,
  isAllowedTarget,
} from "@/lib/demo-config";
import type { IssueWriteResult, RepoInspection } from "@/lib/demo-types";

export class GitHubConnectionRequiredError extends Error {
  constructor(message = "GitHub is not connected for this user.") {
    super(message);
    this.name = "GitHubConnectionRequiredError";
  }
}

async function getGitHubToken() {
  try {
    const { token } = await auth0.getAccessTokenForConnection({
      connection: "github",
    });
    return token;
  } catch (error) {
    throw new GitHubConnectionRequiredError(
      error instanceof Error ? error.message : undefined,
    );
  }
}

async function getGitHubClient() {
  const token = await getGitHubToken();

  return new Octokit({
    auth: token,
    userAgent: "verified-agent-actions-demo",
    request: {
      headers: {
        "X-GitHub-Api-Version": "2026-03-10",
      },
    },
  });
}

export async function getGitHubUser() {
  const octokit = await getGitHubClient();
  const { data } = await octokit.request("GET /user");

  return {
    login: data.login,
    html_url: data.html_url,
  };
}

export async function inspectTargetRepo(): Promise<RepoInspection> {
  const octokit = await getGitHubClient();

  const [userResponse, repoResponse, issuesResponse, readmeFound] =
    await Promise.all([
      octokit.request("GET /user"),
      octokit.request("GET /repos/{owner}/{repo}", {
        owner: DEMO_TARGET_OWNER,
        repo: DEMO_TARGET_REPO,
      }),
      octokit.request("GET /repos/{owner}/{repo}/issues", {
        owner: DEMO_TARGET_OWNER,
        repo: DEMO_TARGET_REPO,
        state: "open",
        per_page: 20,
      }),
      octokit
        .request("GET /repos/{owner}/{repo}/contents/{path}", {
          owner: DEMO_TARGET_OWNER,
          repo: DEMO_TARGET_REPO,
          path: "README.md",
        })
        .then(() => true)
        .catch(() => false),
    ]);

  return {
    githubUser: {
      login: userResponse.data.login,
      html_url: userResponse.data.html_url,
    },
    repo: {
      name: repoResponse.data.name,
      full_name: repoResponse.data.full_name,
      html_url: repoResponse.data.html_url,
      private: repoResponse.data.private,
      open_issues_count: repoResponse.data.open_issues_count,
      default_branch: repoResponse.data.default_branch,
    },
    issues: issuesResponse.data
      .filter((issue) => !("pull_request" in issue))
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        html_url: issue.html_url,
      })),
    readmeFound,
  };
}

export async function createIssueAfterApproval(
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<IssueWriteResult> {
  if (!isAllowedTarget(owner, repo)) {
    throw new Error("Refusing to write outside the configured demo repository.");
  }

  const octokit = await getGitHubClient();
  const existingIssues = await octokit.request(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner,
      repo,
      state: "open",
      per_page: 50,
    },
  );

  const existingDemoIssue = existingIssues.data.find(
    (issue) => !("pull_request" in issue) && issue.body?.includes(DEMO_MARKER),
  );

  if (existingDemoIssue) {
    return {
      status: "already-exists",
      issue: {
        number: existingDemoIssue.number,
        title: existingDemoIssue.title,
        body: existingDemoIssue.body,
        html_url: existingDemoIssue.html_url,
      },
    };
  }

  const created = await octokit.request("POST /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    title,
    body,
  });

  return {
    status: "created",
    issue: {
      number: created.data.number,
      title: created.data.title,
      body: created.data.body,
      html_url: created.data.html_url,
    },
  };
}

export function isGitHubConnectionRequired(error: unknown) {
  return error instanceof GitHubConnectionRequiredError;
}
