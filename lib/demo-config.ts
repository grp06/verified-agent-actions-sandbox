export const DEMO_MARKER = "<!-- verified-agent-actions-demo -->";

export type DemoConfig = {
  appBaseUrl: string;
  targetOwner: string;
  targetRepo: string;
  dryRun: boolean;
};

export function getDemoConfig(): DemoConfig {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const targetOwner = process.env.GITHUB_TARGET_OWNER;
  const targetRepo = process.env.GITHUB_TARGET_REPO;

  if (!targetOwner || !targetRepo) {
    throw new Error(
      "Missing GITHUB_TARGET_OWNER or GITHUB_TARGET_REPO in the environment.",
    );
  }

  return {
    appBaseUrl,
    targetOwner,
    targetRepo,
    dryRun: process.env.DEMO_DRY_RUN !== "false",
  };
}

export function isAllowedTarget(owner: string, repo: string) {
  const config = getDemoConfig();
  return owner === config.targetOwner && repo === config.targetRepo;
}
