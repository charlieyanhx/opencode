# PP Code

The PP integration for the OpenCode fork: a suite shell, shared visual treatment,
the existing language selector with PP English/Chinese translations, and an
OpenAI-compatible model gateway with explicit regional routing.

This release supports a **private, single-operator workspace**. It does not
implement shared suite accounts, tenant isolation, usage billing, or automatic
model selection based on task quality.

## Run locally

Use the Bun version pinned in the root `package.json` (currently 1.4.2).

```sh
bun install --frozen-lockfile
cp pp/.env.example pp/.env
cp pp/router/config.example.json pp/router.local.json
```

Edit `pp/.env`:

- Generate separate random values of at least 32 characters for
  `OPENCODE_PASSWORD` and `PP_ROUTER_API_KEY`.
- Set `PP_UPSTREAM_API_KEY` to your model provider's credential.
- Optionally supply real PP suite URLs for home, chat and workflows.
  Links without configured URLs are hidden.

Edit `pp/router.local.json`:

- Set the provider's actual API base URL and model ID.
- Select `cn` or `global`, and set each alias's allowed regions.
- Verify the model's context window, maximum output tokens and tool-call support.
  The example's limits are placeholders, not verified provider specifications.
- Keep the local router bound to loopback. The launcher rejects a public bind.

From the repository root:

```sh
bun run pp:dev
```

Open `http://127.0.0.1:4444` and sign in with `OPENCODE_PASSWORD`. The launcher
starts the router, backend and PP frontend, and shuts down its own processes when
you exit. It does not replace the installed OpenCode service.

State is kept under ignored `pp/.local/`. Optional `PP_SERVER_PORT` and
`PP_APP_PORT` environment variables change the backend and frontend ports.
The router port is defined in its JSON configuration. All three ports must differ.

The launcher derives native OpenCode provider configuration from the router's
allowed aliases and model metadata. Upstream API keys stay in the router process;
the backend receives only the router credential, and the browser build receives
neither credential. Local project configuration and Claude skill discovery are
disabled for this launcher, so they do not override its PP provider configuration.
The coding agent still has the operator's filesystem/process privileges: this is
not an execution sandbox.

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

China and international profiles use explicit regional model allowlists; region
labels are operator-supplied policy and do not verify a provider's data residency.
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
