# PP Code handoff — 2026-10-22

PP Code is the PP Suite coding workspace: a fork of OpenCode on branch `pp-suite` of
https://github.com/charlieyanhx/opencode. The PP web build shows no upstream branding
(see [README](README.md)); the remaining work is connecting a live model router and hosting.

Run it locally: copy `pp/.env.example` to `pp/.env`, fill in the two secrets and the router
URL, then `bun run pp:dev` from the repository root (Bun 1.4.2, see [README](README.md)).
Checks: `bun run pp:check`; CI runs `.github/workflows/pp.yml` on every push to `pp-suite`.

## Model router

PP Code's backend calls the PP router's OpenAI-compatible API. Nothing else talks to the router.

| PP Code sends                                                                                 | Router must                                                                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET {PP_ROUTER_BASE_URL}/models`                                                             | list the model PP Code uses                                                                                  |
| `POST {PP_ROUTER_BASE_URL}/chat/completions`, `stream: true`, function `tools`, `tool_choice` | stream text and tool-call deltas, end with `data: [DONE]`, accept `tool` result messages on the next request |
| `Authorization: Bearer <PP_ROUTER_API_KEY>`                                                   | accept only that key (`PPROUTER_API_KEY` on the router)                                                      |

1. **Get the router code.** The `/v1` compatibility layer is pp-router commit `577ed39` on branch
   `opencode-compat`. On 2026-10-22 it existed only on Charlie's machine; push it before review.
2. **Deploy** it behind HTTPS, ideally on the same private network as PP Code. Provider keys
   (StepFun, BigModel, …) stay on the router only.
3. **Accept it from PP Code's side.** Put the router URL, key and (optionally) model in `pp/.env`, then:
   ```sh
   bun run pp:router-check
   ```
   It must print four `PASS` lines: wrong key rejected, model listed, a streamed tool call, and an
   answer after the tool result. Against the local router with placeholder provider keys the first
   two pass and the tool call fails with `upstream_error`, as expected.
4. **Set real limits on both sides.** PP Code currently declares `auto` with 16,384 context and
   4,096 output tokens, and the router caps output with `MAX_OUTPUT_TOKENS=4096`. A coding agent's
   instructions and tool definitions alone use much of 16K. Recommended:
   - Pin one coding model per session (for example `glm-5.1`) instead of `auto`, which re-routes
     every agent step and can switch models mid-task. Keep `auto` for chat.
   - Declare the model's real context window and raise output to 16K–32K on both sides.
   - Consider reasoning for the complex tier, a higher `MAX_CONCURRENT_REQUESTS`, and recording
     the per-user `user` field once there are several users.
   - Where to change PP Code's side: `PP_ROUTER_MODEL`, `PP_ROUTER_CONTEXT_TOKENS`,
     `PP_ROUTER_OUTPUT_TOKENS` in `pp/.env` (local), and the `models` block of
     `pp/deploy/opencode.json` (deployment).

## Hosting

The deployment profile is [pp/deploy](deploy/README.md): a Caddy `web` image serving the PP build
and a `backend` image running the PP Code server, for **one trusted operator**.

- Images: `pp/deploy/Dockerfile` targets `backend` and `web`. The `images` job in `pp.yml` builds
  both and checks the web image serves the PP build without source maps or upstream names.
- Required backend settings: `OPENCODE_PASSWORD`, `PP_ROUTER_API_KEY`, `PP_ROUTER_BASE_URL`
  (HTTPS, ending in `/v1`), and `OPENCODE_SERVER_BRAND=pp` (already set in `compose.yaml`; PP
  builds sign in as `pp` and need it). Publish only 80/443; never expose backend port 4096.
- Mainland China: use `compose.cn.yaml` with your own certificate. The domain needs ICP filing
  before mainland servers can serve it. Build images where GitHub and npm are reachable and push
  them to the cloud's registry. Then test from a mainland network: sign in, open a project, run a
  coding session that calls a tool.
- Not included yet: PP accounts, a gateway that maps each signed-in user to an isolated workspace,
  and per-user sandboxes. Those are the multi-user milestone.

## Known gaps

- Upstream `dev` was 133 commits ahead of `pp-suite` on 2026-10-22; merge it regularly and rerun
  `bun run check` and the PP browser build.
- The server's built-in upstream skills ("OpenCode", "Report") are hidden in the app but still
  available to the agent. About shows the upstream version number. `/init` and `/review`
  descriptions are English in the Chinese UI. The `x-opencode-directory`/`x-opencode-ticket`
  headers and the `/openapi.json` title keep upstream names.
- Upstream's own workflows (`check`, `test`, `storybook`, `nix-eval`) stay queued on the fork
  because they expect upstream runners; disable them in the fork's Actions settings.
