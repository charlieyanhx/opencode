# PP model router

A dependency-free Bun 1.4.2 gateway for one trusted operator. The OpenCode backend
calls this service; provider credentials stay in this process. It maps stable PP
model aliases to explicitly approved OpenAI Chat Completions endpoints.

It supports streaming text, tool-call deltas, tool-result continuation,
multimodal payloads, provider extensions, non-streaming JSON and usage fields by
preserving the upstream payload. It makes exactly one upstream request and does
not retry, fall back to another provider, or execute tools.

## Configure and start

From the repository root:

```sh
cp pp/router/config.example.json pp/router/config.local.json
export PP_ROUTER_CONFIG="$PWD/pp/router/config.local.json"
export PP_ROUTER_API_KEY="$(openssl rand -hex 32)"
export PP_UPSTREAM_API_KEY='replace-with-your-provider-key'
bun pp/router/src/index.ts
```

Edit `config.local.json` before starting: supply the approved `baseURL`, actual
`upstreamModel`, deployment `region`, allowed model `regions`, and verified
`contextWindow`, `maxOutputTokens`, and `toolCalling` capabilities. The example
endpoint and capabilities are placeholders, not a recommendation or a claim that
any provider is approved. The JSON contains secret environment-variable **names**,
never credential values. Do not commit your local config or environment file.

`PP_ROUTER_API_KEY` must be at least 32 non-whitespace characters. Use a randomly
generated value and give the same value only to the OpenCode backend. Each active
model must have its `apiKeyEnv` set. Keys for models disallowed in this deployment's
region are not needed. Restart the router after changing configuration or keys.

The hostname defaults to `127.0.0.1` and port to `8787`. Container deployment must
explicitly set `hostname` to `0.0.0.0` and keep the service on a private network.
Only `https:` upstream URLs are accepted, except loopback `http:` for local
inference and tests. URL credentials, query strings, and fragments are rejected;
redirects are never followed.

Use the repository's `pp/opencode.ts` configuration projection and `pp/dev.ts`
launcher to keep the OpenCode model definitions aligned with this configuration.
If configuring OpenCode manually, use provider package `@ai-sdk/openai-compatible`,
base URL `http://127.0.0.1:8787/v1`, the PP router token, and model alias `coding`.
The model context and output limits must match the selected upstream; these are
metadata, not a token meter or spending control.

## API contract

| Endpoint                    | Authentication | Behavior                                                               |
| --------------------------- | -------------- | ---------------------------------------------------------------------- |
| `GET /health`               | None           | Process liveness and configured region; does not probe provider health |
| `GET /v1/models`            | Bearer token   | Aliases allowed in this deployment's region                            |
| `POST /v1/chat/completions` | Bearer token   | OpenAI-compatible request with a configured alias in `model`           |

The router changes only the outgoing `model` field. It supplies the upstream
Authorization header itself; incoming headers, cookies and tenant claims are not
forwarded. Responses expose `x-pp-model-alias`, `x-pp-upstream-model`, and
`x-pp-region` for diagnostics. Streaming output, including tool calls and usage,
is passed through byte for byte without buffering the entire completion. Client
disconnection cancels the upstream fetch. `timeoutMs` limits the upstream call,
including the stream (default 180 seconds).

Requests require JSON, a nonempty messages array, and string message roles.
Unknown OpenAI/provider fields are preserved. `maxRequestBytes` defaults to 2 MiB
and bounds the body before forwarding. Body/schema errors return 400/413/415;
invalid auth returns 401, unknown aliases 404 and disallowed regions 403. Upstream
400/422 responses become a sanitized 400, rate limits become 429, and other
provider failures or redirects become 502. Provider error bodies and exception
messages are never exposed or logged. A network failure after streaming starts
terminates the stream; it cannot replace an already-sent HTTP status or replay
the request.

Region policy is determined only by operator configuration. A caller cannot
change it with a header or request parameter. An allowlist label does not verify
the physical location of a provider's infrastructure: the operator must approve
the endpoint and its handling of data. There is no cross-region fallback.

## Scope

This is a single-operator gateway, not a public multi-tenant service. It does not
provide tenant identity, quotas, token accounting, spending limits, tenant
isolation, an ingress rate limiter or an execution sandbox. Do not expose it as a
public shared inference service. The OpenCode tool runner still has the powers of
its operating-system user. The router's token must never be bundled into browser
assets. Successful provider payloads are trusted model output; HTTP error bodies
are suppressed, but the router is not a prompt/content redaction service.

## Validate

From this directory:

```sh
bun test
bun run typecheck
```

Runtime and HTTP tests use only Bun and Node built-ins. Type checking uses the
repository's installed TypeScript and Bun declarations. Tests start local HTTP
servers on ephemeral ports and require loopback access, but need no external
network or provider key. They cover authentication, region refusal, alias mapping,
tool continuation, incremental SSE tool-call/usage forwarding, disconnect
cancellation, request validation, redirect refusal and sanitized provider errors.
