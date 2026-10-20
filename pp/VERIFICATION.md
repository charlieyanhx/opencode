# Verification record — 2026-10-20

## Completed checks

- Bun 1.4.2 locked dependency installation.
- Baseline upstream browser production build.
- Final repository lint/type checks, PP tests, suite-link tests and PP production
  build passed on the hosted runner for implementation commit `7cc0599`:
  https://github.com/charlieyanhx/opencode/actions/runs/39483503366.
- PP router/configuration suite: 29 tests passed after adding shared-router
  configuration coverage. The standalone router's 24 HTTP/config
  cases also passed 10 repeated runs before integration.
- Suite-link validation: 8 tests passed.
- Actual OpenCode session through the fork's standalone gateway to a loopback fixture model:
  returned the expected assistant message. This used no paid model API.
- Backend authentication: unauthenticated API request returned 401; valid password
  returned 200.
- Both Compose profiles passed configuration validation.
- Both Caddy profiles parsed with the pinned Caddy 2.10.2 binary.
- Separate TypeScript and general code reviews; their actionable findings were fixed.
- Local `.env`, router configuration and state are excluded from Git and the Docker
  build context.
- The PP-enabled browser artifact for `1388969` passed full hosted checks and build:
  https://github.com/charlieyanhx/opencode/actions/runs/39487764009.
- That exact artifact was downloaded for the authenticated, loopback-only preview.
  Browser checks verified the PP header, the server-specific Models settings action,
  Simplified Chinese selection and locale persistence across reload. Browser error
  reporting was empty during those checks. Preview providers are disconnected.
- Shared deployment Compose profiles, entrypoint shell syntax and JSON examples
  passed focused checks after removing the standalone router service.

## Remaining validation

- Complete coding, terminal, responsive and accessibility browser journeys remain
  pending. The focused preview checks above are not full end-to-end acceptance.
- The full monorepo check passed in hosted CI. Avoid running its concurrent type
  checks on a memory-constrained machine.
- Container image build, container startup and deployed TLS: Docker daemon was not
  running on the development machine.
- Live provider, real model tool behavior and mainland network acceptance: require
  the operator's approved endpoint/credential and hosting account/domain.
- Shared-router compatibility must be deployed from the companion router project.
  Its published README URLs returned CloudBase `404 INVALID_HOST` on 2026-10-20.
  The earlier standalone fixture check does not prove a live shared-router connection.

The fixture, schema, routing and configuration checks do not establish live
provider availability, regional data residency, multi-tenant isolation or regulatory
compliance. This is a private single-operator implementation.
