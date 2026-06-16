# Verified Agent Actions

This is a tiny starter kit for showing how Auth0 can secure agent actions: sign
in, connect GitHub, let an agent propose a write, approve it, and watch the
audit trail complete.

The flow is intentionally narrow:

1. A person signs in with Auth0.
2. They connect GitHub through Auth0 Token Vault.
3. The app asks Codex to draft one simple GitHub issue.
4. The person reviews the exact action.
5. The server creates that approved issue in a sandbox repo.

The point is not that the agent is brilliant. The point is that delegated
access, approval, and auditability become the interesting part once software can
take action for a user.

This starter kit skips Auth0 FGA and MCP on purpose. They are good next steps,
but they are not needed for the core story.

## What You Need

- Node.js and npm
- An Auth0 Regular Web Application
- Auth0 Connected Accounts for Token Vault
- A GitHub App installed on one sandbox repository
- The Codex CLI if you want the live agent draft path

The app is pinned to Next.js 15.5 because the Auth0 SDK's Next 16 proxy path was
unreliable in local testing. Keep that pin unless you are deliberately
revalidating the auth setup.

## Run It Locally

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Generate an Auth0 session secret:

```bash
openssl rand -hex 32
```

Then fill in `.env.local`:

```bash
AUTH0_SECRET="..."
APP_BASE_URL="http://localhost:3000"
AUTH0_DOMAIN="YOUR_AUTH0_DOMAIN"
AUTH0_CLIENT_ID="YOUR_AUTH0_REGULAR_WEB_APP_CLIENT_ID"
AUTH0_CLIENT_SECRET="YOUR_AUTH0_REGULAR_WEB_APP_CLIENT_SECRET"
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth0 Setup

Create a Regular Web Application in Auth0.

Use these local URLs:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

Enable refresh tokens/offline access for the app. Also enable this Token Vault
grant type:

```text
urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token
```

Create a GitHub social connection with Connected Accounts for Token Vault
enabled, then enable that connection for this app.

Grant the app these My Account API permissions:

- `create:me:connected_accounts`
- `read:me:connected_accounts`
- `delete:me:connected_accounts`

One important detail: GitHub is the connected action account, not the primary
login method. The app sends users through the database connection for login, then
connects GitHub separately.

## GitHub Setup

Use a dedicated sandbox repo with Issues enabled.

Create a GitHub App, not a classic OAuth App. Auth0 Token Vault needs GitHub App
user tokens so it can get the refresh-token behavior Connected Accounts expects.

Use these GitHub App settings:

- Homepage URL: `https://YOUR_AUTH0_DOMAIN`
- Callback URL: `https://YOUR_AUTH0_DOMAIN/login/callback`
- Webhook: inactive
- Expire user authorization tokens: enabled
- Repository permissions:
  - Contents: Read-only
  - Issues: Read and write
  - Metadata: Read-only

Install the GitHub App only on the sandbox repo. Then copy the GitHub App's
Client ID and Client Secret into the Auth0 GitHub social connection.

Do not add `repo` or `public_repo` scopes in the app code. The GitHub App
permissions are configured in GitHub and approved when the app is installed or
authorized.

## Demo Flow

1. Log in with Auth0.
2. Connect GitHub.
3. Click **Run starter flow**.
4. Review the repo, endpoint, issue title, and issue body.
5. Click **Approve issue creation**.

Repeated runs look for `<!-- verified-agent-actions-demo -->` in open issues so
the demo does not create duplicates.

## What Codex Does

The app calls `codex exec` locally and gives it only sanitized repo facts: repo
name, default branch, README presence, issue count, connected GitHub user, and a
few existing issue titles.

Codex drafts a small issue suggesting that the app background be changed to one
of ten randomly selected colors. It does not receive GitHub tokens, write files,
or create GitHub issues.
If Codex is unavailable, the app uses a deterministic fallback draft so the demo
still works on stage.

The Codex path uses `codex exec` with `model_reasoning_effort="none"`.

## Safety Model

- GitHub tokens stay on the server.
- The browser never receives the GitHub access token.
- Writes are allowlisted to `grp06/verified-agent-actions-sandbox`.
- The approval button sends back a signed, short-lived plan token.
- The server creates the exact issue draft the user reviewed.

## Production Next Steps

For a production version, replace the local approval button with Auth0
Asynchronous Authorization/CIBA, add Auth0 FGA for resource-level permissions,
and expose agent tools through a protected MCP server.
