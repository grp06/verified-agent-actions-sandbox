import { createHmac, timingSafeEqual } from "node:crypto";

import type { AgentPlan } from "@/lib/demo-types";

const TOKEN_TTL_SECONDS = 10 * 60;

type PlanTokenPayload = {
  exp: number;
  iat: number;
  plan: AgentPlan;
  sub: string;
};

export class PlanTokenError extends Error {
  constructor(message = "The approval token is invalid or expired.") {
    super(message);
    this.name = "PlanTokenError";
  }
}

function getSigningSecret() {
  const secret = process.env.AUTH0_SECRET;

  if (!secret) {
    throw new Error("AUTH0_SECRET is required.");
  }

  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function assertPlan(value: unknown): asserts value is AgentPlan {
  if (!value || typeof value !== "object") {
    throw new PlanTokenError();
  }

  const plan = value as Record<string, unknown>;

  if (
    plan.action !== "create_issue" ||
    typeof plan.owner !== "string" ||
    typeof plan.repo !== "string" ||
    typeof plan.title !== "string" ||
    typeof plan.body !== "string" ||
    typeof plan.reason !== "string" ||
    typeof plan.endpoint !== "string" ||
    !Array.isArray(plan.observations)
  ) {
    throw new PlanTokenError();
  }
}

export function signAgentPlan(plan: AgentPlan, userSub: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: PlanTokenPayload = {
    exp: now + TOKEN_TTL_SECONDS,
    iat: now,
    plan,
    sub: userSub,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAgentPlanToken(token: string, userSub: string) {
  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new PlanTokenError();
  }

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) {
    throw new PlanTokenError();
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    throw new PlanTokenError();
  }

  let payload: Partial<PlanTokenPayload>;

  try {
    payload = JSON.parse(decode(encodedPayload)) as Partial<PlanTokenPayload>;
  } catch {
    throw new PlanTokenError();
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    payload.sub !== userSub ||
    typeof payload.exp !== "number" ||
    payload.exp < now
  ) {
    throw new PlanTokenError();
  }

  assertPlan(payload.plan);
  return payload.plan;
}
