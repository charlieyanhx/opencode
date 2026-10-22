# PP OpenCode integration plan

Status: fork created, 2026-10-20. GitHub fork:
https://github.com/charlieyanhx/opencode. Local working branch: `pp-suite`.
Remote `origin` retains upstream; remote `pp` points to the fork.
Implementation is on `pp-suite`; see `pp/README.md` for the local launcher,
shared-router connection and deployment setup. No hosted deployment has been made.

The router of record is https://github.com/Principle-of-Procrastination/pp-router.
The fork defaults to its `/v1` compatibility API and `auto` model, preserving its
English/Chinese classifier and LiteLLM fallback policy. The companion
`pp-code-api` branch adds the tool-preserving compatibility API. The fork's
initial gateway remains an explicit standalone development option only.

## Product direction

OpenCode becomes the coding workspace in the PP suite. PP owns suite navigation,
identity integration, model-routing policy, visual identity, language preferences,
and regional deployment configuration. Keep OpenCode's agent execution and
session semantics intact wherever possible.

Initial delivery assumption: browser application first, Simplified Chinese and
English first, with additional language packs supported by the same architecture.
Desktop and TUI remain upstream-compatible surfaces; suite-wide visual parity is
a later milestone.

## Inspected baseline

- Source: local checkout at commit `6e9c85390bc232866f83ca19dfb46bd9d39b7aa1`,
  branch `dev`, package version `2.0.32`.
- Root LICENSE contains the MIT license and upstream copyright notice; preserve it.
- Required Bun version: `1.4.2`; the system default is `1.3.14`. A task-local
  Bun `1.4.2` was installed and used for verification.
- Locked dependencies installed. The baseline browser build and app type check pass.
- Provider extension: `packages/schema/src/config/provider.ts` and
  `packages/core/src/config/plugin/provider.ts`.
- Language layer: `packages/app/src/runtime/i18n/language.tsx`, app dictionaries,
  and `packages/ui` dictionaries. Existing support includes RTL and pluralization.
- Visual foundation: `packages/ui/src/theme`.
- The adjacent `model-matcher` project recommends models and pipelines. Do not
  assume that its recommendation API is an inference gateway.

## Implementation sequence

### 1. Reproducible fork and provider boundary

The `pp-suite` branch was created from the locally recorded `origin/dev` state
above. Keep PP additions isolated for upstream merges.
Use the pinned Bun runtime and locked dependencies, then run `bun run check`.
Record baseline failures separately from PP regressions.

Start with the example in `pp/opencode.example.json`. It describes a PP provider
using an OpenAI-compatible gateway and one explicit model alias. It is a template,
not an active configuration or an implemented router. The gateway must advertise
the real context limits and capabilities before the alias is enabled for users.

Acceptance: one authenticated request streams through the gateway; a coding
session completes a tool call and continuation; cancellation works; invalid
credentials and unavailable models return actionable errors.

### 2. Model router

Keep provider secrets and tenant policy on the server. OpenCode consumes stable
PP model aliases; the gateway maps those aliases to approved endpoints.
Policy input includes tenant, deployment region, task capability, budget and
explicit user model choice. Enforce identity from verified credentials, never
from an untrusted tenant header.

Start with deterministic model selection and explicit errors. Add health-based
fallback only within the permitted region/provider set. Do not silently retry
an already-streaming response or replay tool side effects. Expose the chosen model,
usage and fallback reason. No cross-region fallback by default.

Acceptance: streaming, tool calls, cancellation, usage reporting, tenant isolation,
budget rejection, and regional denial are covered by gateway integration tests.
Implement compatibility in the existing PP router instead of duplicating its
classifier or fallback policy. Tenant isolation and budget controls remain later
milestones; this delivery uses a private shared service token.

### 3. Shared PP shell and styling

Add suite navigation, workspace identity, account controls and model selection
around the coding workspace. Reuse semantic theme tokens and real UI components.
Extract PP colors, typography, spacing and icons into a versioned shared contract
that subsequent LibreChat and Flow integrations can consume.

Acceptance: light/dark themes, keyboard navigation, visible focus, responsive
layout, readable Chinese text and a complete code-editing journey.
Suite navigation does not imply sharing authentication tokens across applications.

### 4. Translation layer

Extend the current localization system instead of replacing it. Namespace PP
strings, preserve interpolation and plural rules, and share the selected locale
through the suite profile. Keep language independent from deployment region.

Ship reviewed zh-CN and English dictionaries first. Add a translation workflow:
extract changed keys, generate draft translations, review them, validate placeholders,
and publish versioned language packs. Use English fallback for missing strings.
Test long text, RTL, plural categories and locale persistence.

“Any language” means extensible locale support with a defined fallback; it does
not mean every language ships with verified translations on day one. UI language,
assistant response language and translation of user documents are separate settings.
Do not automatically translate code, identifiers, commands or user documents.

### 5. China deployment

Prepare distinct mainland-China and international deployment profiles. Decide the
mainland host, domain, account owner and permitted model endpoints before deployment.
Confirm current hosting and applicable service requirements with the selected
provider before launch; this document makes no compliance determination.

Serve application assets and fonts from the selected regional deployment. Inventory
runtime dependencies on external model catalogs, telemetry, authentication, update
checks, package downloads and third-party services. Provide regional configuration
or explicit disabled states where a dependency is unavailable.

Run the server beside isolated execution workers. A public coding agent must not
run arbitrary tenant code in a shared host filesystem. Add authenticated ingress,
workspace isolation, secret handling, quotas and log redaction before public access.

Acceptance: from an actual mainland network, sign in, create a workspace, load all
assets, start a streamed conversation, execute a tool and reconnect successfully.
Test blocked external services, backup restoration and release rollback.

## First milestone

One locally runnable PP-branded coding workspace, selectable Chinese/English,
connected to a real PP gateway with one approved model and a verified coding
session. A publicly reachable site is a later milestone, after tenant isolation
and regional validation.

Open decisions: existing PP identity service; canonical suite design source;
mainland cloud account/domain; initial approved model endpoints. The implementation
includes a new standalone router because an existing inference gateway was not
identified in this workspace. The broader suite account system, quality-based
model selection, multi-tenant execution, additional reviewed translations, and
live mainland hosting remain later milestones.
