# PP Code

The PP integration for the OpenCode fork: a suite shell, shared visual treatment,
the existing language selector with PP English/Chinese translations, and a direct
connection to the original PP model router's OpenAI-compatible endpoint.

This release supports a **private, single-operator workspace**. It does not
implement shared suite accounts, tenant isolation, usage billing, or automatic
model selection based on task quality.

## Existing PP router integration status

The initial gateway in `pp/router` was created for this fork. It is retained as an
explicit standalone option, but **shared mode is now the default**. Shared mode
calls the original PP router directly and does not start that gateway.

The existing project is [Principle-of-Procrastination/pp-router](https://github.com/Principle-of-Procrastination/pp-router),
a FastAPI/LiteLLM router with English/Chinese complexity classification and model
fallbacks. Its original `/chat` and `/chat/stream` endpoints accept text chat and
emit a custom response/SSE format. The companion `opencode-compat` branch adds
`/v1/chat/completions` for message history, tool calls/results and OpenAI streams,
using that project's existing routing policy. Deploy that compatibility change
before enabling shared mode; pointing OpenCode at the old `/chat` endpoint is not
sufficient.

On 2026-10-20, the backend and frontend addresses published in that project's
README returned CloudBase `404 INVALID_HOST`. A working deployment endpoint is
still needed. The local UI preview therefore has model providers disconnected.

## Run locally

Use the Bun version pinned in the root `package.json` (currently 1.4.2).
To install it only for this checkout, without changing your system runtime:

```sh
npm install --prefix pp/.local/toolchain --no-audit --no-fund bun@1.4.2
export PATH="$PWD/pp/.local/toolchain/node_modules/.bin:$PATH"
```

```sh
bun install --frozen-lockfile
cp pp/.env.example pp/.env
```

Edit `pp/.env`:

- Set `PP_ROUTER_MODE=shared` and `PP_ROUTER_BASE_URL` to the original router's
  `/v1` endpoint. Local example: `http://127.0.0.1:4000/v1`. Remote endpoints require HTTPS.
- Set `PP_ROUTER_API_KEY` to the router server's `PPROUTER_API_KEY` (at least 32
  random characters). Keep StepFun/BigModel credentials on the router server.
- Generate a different random value of at least 32 characters for `OPENCODE_PASSWORD`.
- Optionally supply real PP suite URLs for home, chat and workflows.
  Links without configured URLs are hidden.

From the repository root:

```sh
bun run pp:dev
```

Open `http://127.0.0.1:4444` and sign in with `OPENCODE_PASSWORD`. The launcher
starts the backend and PP frontend, connects to the existing router, and shuts
down its own processes when you exit. It does not replace the installed OpenCode service.

State is kept under ignored `pp/.local/`. Optional `PP_SERVER_PORT` and
`PP_APP_PORT` environment variables change the backend and frontend ports.
The shared router must run separately on a different port or host.

The native `pp/auto` model delegates selection and fallback to PP's existing
classifier. Integration limits are conservatively set to 16384 context tokens and
4096 output tokens; the router also applies its own output cap. Verify the actual
providers' tool behavior before live use. Upstream API keys stay on the router;
the backend receives only the router credential, and the browser receives
neither credential. Local project configuration and Claude skill discovery are
disabled for this launcher, so they do not override its PP provider configuration.
The coding agent still has the operator's filesystem/process privileges: this is
not an execution sandbox.

### Optional standalone gateway

For isolated proxy development only, set `PP_ROUTER_MODE=standalone`, copy
`pp/router/config.example.json` to `pp/router.local.json`, and configure
`PP_UPSTREAM_API_KEY`, provider URL/model, region allowlists and verified model
limits. The launcher then starts the fork's loopback gateway. This mode does not
use PP's original classifier or fallback policy.

## Translation and styling

`VITE_PP_ENABLED=true` enables the PP browser shell. Ordinary upstream builds
remain available without that flag. The shell uses the existing theme and locale
contexts, including the current language catalogs, RTL layout and English fallback.

New PP copy has English source keys and Simplified Chinese translations.
Other languages inherit English for new PP strings until their translations are
added and reviewed. See the app's PP localization notes for the review sources.
This is extensible language support, not a claim that every language has complete,
reviewed PP translations. Assistant response language and document translation
are separate from UI localization.

## Router and deployment

- [Router API, limits and tests](router/README.md)
- [Single-operator TLS deployment and China profile](deploy/README.md)
- [Architecture and milestones](../PP-FORK-PLAN.md)

Shared deployments use the existing PP router's provider configuration and policy.
The fork does not override its model selection or attest to provider data residency.
The China profile uses an operator-provided TLS certificate. Application assets
are served from the deployment; external integrations still require network testing
from the actual deployment location.

`opencode.example.json` remains an inactive manual integration template. Prefer the
local launcher, or the paired deployment configuration files, for complete model
metadata. Never overwrite an existing user's configuration with the example.

## Checks

```sh
bun run pp:check
bun run --cwd packages/app typecheck
VITE_PP_ENABLED=true bun run --cwd packages/app build
bun run check
```

Router tests use real local HTTP servers and fixture responses. They do not call
a paid model provider. Successful fixture tests do not prove live provider quality
or mainland network availability.

On a memory-constrained machine, run the focused `pp:check` first and use the hosted
PP workflow for the full repository check and browser build. Do not run type checks,
production builds and browser automation concurrently. See [verification](VERIFICATION.md)
for completed checks and the remaining live-deployment acceptance work.
