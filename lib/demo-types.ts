export type DemoStatus = {
  authenticated: boolean;
  githubConnected: boolean;
  user?: {
    name?: string;
    email?: string;
    picture?: string;
  };
  githubUser?: GitHubUser;
  target?: {
    owner: string;
    repo: string;
  };
  connectError?: string | null;
};

export type AgentPlan = {
  id: string;
  action: "create_issue";
  owner: string;
  repo: string;
  title: string;
  body: string;
  reason: string;
  endpoint: string;
  observations: string[];
};

export type GitHubUser = {
  login: string;
  html_url: string;
};

export type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  open_issues_count: number;
  default_branch: string;
};

export type GitHubIssue = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  pull_request?: unknown;
};

export type RepoInspection = {
  repo: GitHubRepo;
  issues: GitHubIssue[];
  readmeFound: boolean;
  githubUser: GitHubUser;
};

export type IssueWriteResult =
  | {
      status: "already-exists";
      issue: GitHubIssue;
    }
  | {
      status: "created";
      issue: GitHubIssue;
    };

export type PlanResponse = {
  inspection: RepoInspection;
  plan: AgentPlan;
  planToken: string;
};

export type ApprovalResponse = {
  plan: AgentPlan;
  result: IssueWriteResult;
};
