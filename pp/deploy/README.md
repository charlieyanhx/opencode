# PP Code private deployment

This stack runs **one trusted operator's coding workspace**. OpenCode can execute commands, read and edit files, install packages, and access credentials available inside its container. All signed-in clients share that workspace and the same server password. This is not a multi-user SaaS or an isolation boundary between users.

The browser connects over HTTPS to Caddy. Caddy serves the built PP app and forwards `/api/*`, `/auth/*`, and `/openapi.json` to the authenticated OpenCode server without rewriting paths. The app uses its existing sign-in screen; enter the server password from `.env` (username `opencode` for API clients). Static sign-in assets are public; workspace APIs require authentication. WebSocket tickets and SSE streaming use the existing backend authentication. The model router has no published port and keeps the upstream provider key out of the backend and browser.

## Prepare

Use a Linux Docker host with Compose v2 or newer, sufficient disk for the monorepo build, and a hostname you control. The build pins Bun 1.4.2 and Caddy 2.10.2; use reviewed image digests in your own release pipeline. Run commands below from `pp/deploy`.

```sh
cp .env.example .env
cp opencode.example.json opencode.json
chmod 600 .env
openssl rand -hex 32
openssl rand -hex 32
```

Edit `.env`: set the hostname, use the two different generated values for `OPENCODE_PASSWORD` and `PP_ROUTER_API_KEY`, and supply your provider key as `PP_UPSTREAM_API_KEY`. Do not put secrets in `VITE_*` variables; those values are compiled into browser JavaScript. Startup rejects missing credentials, and the server and router require credentials of at least 32 characters.

Point your hostname's DNS to the host. Only ports 80 and 443 are published. Restrict access at your firewall or private network to the operator's devices when possible. Do not publish backend port 4096 or router port 8787, and do not mount the host Docker socket.

## Global profile

```sh
cp router.global.example.json router.global.json
```

Edit `router.global.json` to choose the actual HTTPS OpenAI-compatible provider base URL and upstream model ID. Keep the `coding` alias in sync with `opencode.json`; this is the app's `pp/coding` model. The `.example` provider address deliberately cannot serve model requests.

The sample context window of 32768, output limit of 4096, and tool-calling support are placeholders. Verify them against the selected model and set the same values in both `router.global.json` and `opencode.json`. Additional aliases also need matching entries in both files.

```sh
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml up -d --build
```

Caddy obtains and renews a TLS certificate for the supplied domain. Its certificate authority endpoints must be reachable, and DNS and incoming challenge traffic must be configured correctly.

## Mainland China profile

```sh
cp router.cn.example.json router.cn.json
mkdir -p certs
```

Edit `router.cn.json` to use the mainland endpoint and model approved for your deployment. Verify its placeholder context/output limits and tool-calling support, then match those values in `opencode.json`. Its region is `cn`, and the alias is allowed only in that region. There is no automatic fallback to a global provider. Region labels do not attest to where an endpoint stores data: confirm endpoint location and provider terms separately.

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

1. `docker compose --env-file .env -f compose.yaml ps` reports healthy backend and router containers.
2. A request to `/api/info` without credentials returns HTTP 401, while signing in succeeds.
3. A `pp/coding` chat streams a real response and completes a harmless tool call in a disposable project.
4. The terminal opens, reconnects, and streams output through HTTPS.
5. Language selection persists across reload; UI scripts and fonts load from your own hostname.
6. Restarting the stack preserves the project files and chat history.

Use the additional `-f compose.cn.yaml` on mainland commands. Container health checks confirm local process readiness, not upstream credentials, provider reachability, or model compatibility.

## Persistence, upgrades, and recovery

Named volumes persist `/workspace`, the operator home, OpenCode data/config/cache/state, and Caddy certificate data. The backend runs as the image's non-root `bun` user. Code execution shares the backend's router token, server password, and workspace; upstream provider keys are present only in the separate router container.

Before an upgrade, stop the stack and back up the named volumes and the private host configuration. Rebuild images from a recorded fork commit, then start and run the verification checklist. Keep the prior images and corresponding volume backup for rollback: database migrations can make rolling back just the image insufficient. `docker compose down` preserves named volumes; adding `--volumes` deletes them.

Changing optional suite URLs requires rebuilding the web image. Rotating the server password invalidates existing authenticated sessions and requires signing in again.

## Verification status

The paths, password environment variable, `/api/info` health route, CLI `serve` flags, XDG storage directories, and production same-origin API behavior were checked against this fork's source. Both Compose definitions passed configuration validation. The actual backend command started under Bun 1.4.2 from a temporary workspace with this deployment's OpenCode configuration; `/api/info` returned 401 without credentials and 200 with the configured password.

The local Docker daemon was unavailable, and no standalone Caddy binary was installed. Image build, Caddy configuration validation, live TLS, browser sessions through this proxy, paid model calls, and mainland network reachability remain unverified.
