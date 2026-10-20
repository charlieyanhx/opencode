# PP Code private deployment

This stack runs **one trusted operator's coding workspace**. OpenCode can execute commands, read and edit files, install packages, and access credentials available inside its container. All signed-in clients share that workspace and the same server password. This is not a multi-user SaaS or an isolation boundary between users.

The browser connects over HTTPS to Caddy. Caddy serves the built PP app and forwards `/api/*`, `/auth/*`, and `/openapi.json` to the authenticated OpenCode server without rewriting paths. The app uses its existing sign-in screen; enter the server password from `.env` (username `opencode` for API clients). Static sign-in assets are public; workspace APIs require authentication. WebSocket tickets and SSE streaming use the existing backend authentication.

The backend calls the existing [PP model router](https://github.com/Principle-of-Procrastination/pp-router), a separate FastAPI/LiteLLM service. The `pp/auto` model uses its classifier and fallback routing through the OpenAI-compatible `/v1/chat/completions` endpoint. This stack contains only the web and backend containers. Provider credentials, model allowlists, route selection, and regional policy belong to the shared router; provider keys never enter this stack or the browser.

## Prepare

Use a Linux Docker host with Compose v2 or newer, sufficient disk for the monorepo build, and a hostname you control. The build pins Bun 1.4.2 and Caddy 2.10.2; use reviewed image digests in your own release pipeline. Run commands below from `pp/deploy`.

```sh
cp .env.example .env
cp opencode.example.json opencode.json
chmod 600 .env
openssl rand -hex 32
```

Edit `.env`: set the hostname and use the generated value for `OPENCODE_PASSWORD`. Set `PP_ROUTER_BASE_URL` to your deployed shared router's HTTPS base URL ending in `/v1`. Set `PP_ROUTER_API_KEY` to the same value as that service's `PPROUTER_API_KEY`; use at least 32 random characters and keep it different from the OpenCode password. If the router has no key yet, generate another value and configure it on both services. Do not put secrets in `VITE_*` variables; those values are compiled into browser JavaScript. Startup rejects missing or short credentials and a router URL without HTTPS.

Deploy a PP router revision that provides authenticated `/v1/models` and `/v1/chat/completions`, including streaming and tool calls. Historical URLs in the router repository are not a provisioned endpoint for this installation; supply and verify your own live service. Configure its provider credentials and permitted models there. The sample OpenCode limits are conservative (16384 context, 4096 output); every routed model must support those limits and text tool calls. Reduce them if your router's fallback pool includes a smaller model.

Point your hostname's DNS to the host. Only ports 80 and 443 are published. Restrict access at your firewall or private network to the operator's devices when possible. Do not publish backend port 4096, and do not mount the host Docker socket. The backend needs outbound HTTPS access to your shared router.

## Global profile

Use a shared router endpoint with the providers and fallback policy approved for this deployment. The `auto` model is intentional: the shared service chooses the model rather than this application selecting a fixed provider.

```sh
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml up -d --build
```

Caddy obtains and renews a TLS certificate for the supplied domain. Its certificate authority endpoints must be reachable, and DNS and incoming challenge traffic must be configured correctly.

## Mainland China profile

```sh
mkdir -p certs
```

Set `PP_ROUTER_BASE_URL` to a shared router deployment reachable from your mainland host. Configure that service's model allowlist and **every fallback** to use the endpoints approved for this deployment. The China Compose override changes TLS handling only; it does not impose regional routing rules on the remote service. Confirm model endpoint location, data handling, and provider terms separately before enabling requests.

Place the certificate chain for your hostname in `certs/fullchain.pem` and its private key in `certs/privkey.pem`. Restrict private-key file permissions on the host. This profile uses your supplied certificate and does not require automatic certificate issuance at runtime.

```sh
docker compose --env-file .env -f compose.yaml -f compose.cn.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.cn.yaml up -d --build
```

Choose a mainland server and registry accessible to your operator. Resolve any domain, provider, and hosting approvals with your hosting provider before exposing the instance. Build dependencies still come from their locked package and Git sources; a mainland runtime does not make those build sources reachable. Build on a connected builder and transfer the resulting images to your registry if necessary. No public mirror is silently substituted.

The PP build bundles its own interface assets and fonts, and OpenCode model-catalog fetching and automatic updating are disabled. User-installed tools, package registries, repository hosts, model endpoints, and content opened by the user can still require network access. Test those endpoints from the actual mainland host and target browser; these files do not establish that network availability.

Replace certificates before expiry and reload Caddy after replacement:

```sh
docker compose --env-file .env -f compose.yaml -f compose.cn.yaml exec web caddy reload --config /etc/caddy/Caddyfile
```

## First use and verification

Open `https://<your-hostname>`, sign in, and choose `/workspace` in the project picker. To clone a project into the persistent workspace:

```sh
docker compose --env-file .env -f compose.yaml exec backend sh
```

The shell starts in `/workspace`. Install any project-specific toolchains in a derived image or in persistent user directories; the application image itself is read-only. Keep only the repositories and credentials that this operator should be able to access inside the container.

Verify these behaviors before relying on the deployment:

1. `docker compose --env-file .env -f compose.yaml ps` reports a healthy backend and a running web container. Separately verify the shared router's authenticated `/v1/models` endpoint lists `auto`.
2. A request to `/api/info` without credentials returns HTTP 401, while signing in succeeds.
3. A `pp/auto` chat streams a real response and completes a harmless tool call in a disposable project; router-side logs confirm the intended provider and fallback policy.
4. The terminal opens, reconnects, and streams output through HTTPS.
5. Language selection persists across reload; UI scripts and fonts load from your own hostname.
6. Restarting the stack preserves the project files and chat history.

Use the additional `-f compose.cn.yaml` on mainland commands. The backend health check confirms local process readiness, not router credentials, provider reachability, or model compatibility.

## Persistence, upgrades, and recovery

Named volumes persist `/workspace`, the operator home, OpenCode data/config/cache/state, and Caddy certificate data. The backend runs as the image's non-root `bun` user. Code execution shares the backend's router token, server password, and workspace; provider keys remain with the separate shared PP router service. Back up and upgrade that service independently.

Before an upgrade, stop the stack and back up the named volumes and the private host configuration. Rebuild images from a recorded fork commit, then start and run the verification checklist. Keep the prior images and corresponding volume backup for rollback: database migrations can make rolling back just the image insufficient. `docker compose down` preserves named volumes; adding `--volumes` deletes them.

Changing optional suite URLs requires rebuilding the web image. Rotating the server password invalidates existing authenticated sessions and requires signing in again. Coordinate router-token rotation with `PPROUTER_API_KEY` on the shared service and recreate the backend so its environment is updated.

## Verification status

The paths, password environment variable, `/api/info` health route, CLI `serve` flags, XDG storage directories, and production same-origin API behavior were checked against this fork's source. Previous local backend checks returned 401 without credentials and 200 with the configured password; both Caddy profiles passed configuration adaptation. The revised two-container Compose profiles pass configuration validation without a Docker daemon.

Image build, live TLS, browser sessions through this proxy, requests to an operator-provided shared router, paid model calls, and mainland network reachability remain unverified. Configuration validation does not establish that the shared router is deployed or accessible.
