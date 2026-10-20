# Verification record — 2026-10-20

## Completed locally

- Bun 1.4.2 locked dependency installation.
- Baseline upstream browser production build.
- App type check with the initial PP shell; final review corrections are also
  covered by the hosted PP workflow.
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

- Final PP production build and app type check: hosted `.github/workflows/pp.yml`.
- Browser visual/interaction QA: pending. The earlier preview did not complete
  loading, and local browser/build checks were deferred when the user's 8 GB Mac
  reported warning-level memory pressure and increasing swap usage.
- Full monorepo check was not completed; focused integration checks are recorded
  above. Avoid running its concurrent type checks on a memory-constrained machine.
- Container image build, container startup and deployed TLS: Docker daemon was not
  running on the development machine.
- Live provider, real model tool behavior and mainland network acceptance: require
  the operator's approved endpoint/credential and hosting account/domain.

The fixture, schema, routing and configuration checks do not establish live
provider availability, regional data residency, multi-tenant isolation or regulatory
compliance. This is a private single-operator implementation.
