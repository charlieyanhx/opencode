# Verification record — 2026-10-20

## Completed locally

- Bun 1.4.2 locked dependency installation.
- Baseline upstream browser production build.
- Final repository lint/type checks, PP tests, suite-link tests and PP production
  build passed on the hosted runner for implementation commit `7cc0599`:
  https://github.com/charlieyanhx/opencode/actions/runs/39483503366.
- PP router/configuration suite: 28 tests passed. The router's 24 HTTP/config
  cases also passed 10 repeated runs before integration.
- Suite-link validation: 8 tests passed.
- Actual OpenCode session through the PP gateway to a loopback fixture model:
  returned the expected assistant message. This used no paid model API.
- Backend authentication: unauthenticated API request returned 401; valid password
  returned 200.
- Both Compose profiles passed configuration validation.
- Both Caddy profiles parsed with the pinned Caddy 2.10.2 binary.
- Separate TypeScript and general code reviews; their actionable findings were fixed.
- Local `.env`, router configuration and state are excluded from Git and the Docker
  build context.

## Remaining validation

- Browser visual/interaction QA: pending. The earlier preview did not complete
  loading, and local browser/build checks were deferred when the user's 8 GB Mac
  reported warning-level memory pressure and increasing swap usage.
- The full monorepo check passed in hosted CI. Avoid running its concurrent type
  checks on a memory-constrained machine.
- Container image build, container startup and deployed TLS: Docker daemon was not
  running on the development machine.
- Live provider, real model tool behavior and mainland network acceptance: require
  the operator's approved endpoint/credential and hosting account/domain.

The fixture, schema, routing and configuration checks do not establish live
provider availability, regional data residency, multi-tenant isolation or regulatory
compliance. This is a private single-operator implementation.
