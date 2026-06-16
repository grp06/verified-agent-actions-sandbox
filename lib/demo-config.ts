export const DEMO_MARKER = "<!-- verified-agent-actions-demo -->";
export const DEMO_TARGET_OWNER = "grp06";
export const DEMO_TARGET_REPO = "verified-agent-actions-sandbox";

export function isAllowedTarget(owner: string, repo: string) {
  return owner === DEMO_TARGET_OWNER && repo === DEMO_TARGET_REPO;
}
