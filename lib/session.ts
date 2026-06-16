import { auth0 } from "@/lib/auth0";

export class AuthenticationRequiredError extends Error {
  constructor(message = "An Auth0 session with a user subject is required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireUserSub() {
  const session = await auth0.getSession();
  const userSub =
    typeof session?.user.sub === "string" ? session.user.sub : undefined;

  if (!userSub) {
    throw new AuthenticationRequiredError();
  }

  return userSub;
}

export function isAuthenticationRequired(error: unknown) {
  return error instanceof AuthenticationRequiredError;
}
