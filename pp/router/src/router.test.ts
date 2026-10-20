import { afterEach, describe, expect, test } from "bun:test"
import { configure } from "./config"
import { start } from "./index"

const token = "local-router-test-token-at-least-32-characters"
const upstreamKey = "private-upstream-test-key"
const servers: ReturnType<typeof Bun.serve>[] = []
const payload = { model: "coding", messages: [{ role: "user", content: "Help me code" }] }
const capabilities = { contextWindow: 32768, maxOutputTokens: 4096, toolCalling: true }

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)))
})

function fixture(handler: (request: Request) => Response | Promise<Response>, options = {}) {
  const upstream = Bun.serve({ hostname: "127.0.0.1", port: 0, idleTimeout: 0, fetch: handler })
  servers.push(upstream)
  const raw = {
    region: "cn",
    port: 0,
    models: {
      coding: {
        ...capabilities,
        baseURL: `${upstream.url}v1`,
        upstreamModel: "actual-coder",
        apiKeyEnv: "UPSTREAM_KEY",
        regions: ["cn"],
      },
      restricted: {
        ...capabilities,
        baseURL: `${upstream.url}v1`,
        upstreamModel: "global-coder",
        apiKeyEnv: "GLOBAL_KEY",
        regions: ["global"],
      },
    },
    ...options,
  }
  const router = start(configure(raw, { PP_ROUTER_API_KEY: token, UPSTREAM_KEY: upstreamKey }))
  servers.push(router)
  return {
    raw,
    url: router.url,
    async post(body: unknown, headers = {}) {
      return fetch(new URL("v1/chat/completions", router.url), {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    },
  }
}

describe("PP router HTTP contract", () => {
  test("auth protects models and completions; health and the regional model list expose no secrets", async () => {
    const app = fixture(() => {
      throw new Error("Unauthorized requests must not reach the upstream")
    })
    const health = await fetch(new URL("health", app.url))
    expect(await health.json()).toEqual({ status: "ok", region: "cn" })
    for (const authorization of ["", "Bearer invalid", "Basic anything"]) {
      const response = await fetch(new URL("v1/models", app.url), { headers: { authorization } })
      expect(response.status).toBe(401)
      expect(await response.text()).not.toContain(token)
    }
    expect((await app.post(payload, { authorization: "Bearer invalid" })).status).toBe(401)
    const response = await fetch(new URL("v1/models", app.url), { headers: { authorization: `Bearer ${token}` } })
    expect(await response.json()).toEqual({
      object: "list",
      data: [{ id: "coding", object: "model", created: 0, owned_by: "pp" }],
    })
  })

  test("routes an alias and forwards tool continuation, extensions and usage without forwarding client headers", async () => {
    const received = Promise.withResolvers<{ url: string; body: unknown; headers: Headers }>()
    const result = {
      id: "chat-1",
      object: "chat.completion",
      model: "actual-coder",
      choices: [{ index: 0, message: { role: "assistant", content: "Done" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    }
    const app = fixture(async (request) => {
      received.resolve({ url: request.url, body: await request.json(), headers: request.headers })
      return Response.json(result, { headers: { "set-cookie": "provider-secret=do-not-forward" } })
    })
    const continuation = {
      ...payload,
      messages: [
        ...payload.messages,
        {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "call-1", type: "function", function: { name: "read_file", arguments: '{"path":"index.ts"}' } },
          ],
        },
        { role: "tool", tool_call_id: "call-1", content: "export const ok = true" },
      ],
      tools: [{ type: "function", function: { name: "read_file", parameters: { type: "object" } } }],
      provider_extension: { thinking: true },
    }
    const response = await app.post(continuation, { "x-tenant": "spoofed", "x-provider-key": "spoofed" })
    expect(await response.json()).toEqual(result)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("x-pp-region")).toBe("cn")
    expect(response.headers.get("x-pp-upstream-model")).toBe("actual-coder")
    const request = await received.promise
    expect(new URL(request.url).pathname).toBe("/v1/chat/completions")
    expect(request.body).toEqual({ ...continuation, model: "actual-coder" })
    expect(request.headers.get("authorization")).toBe(`Bearer ${upstreamKey}`)
    expect(request.headers.get("x-tenant")).toBeNull()
    expect(request.headers.get("x-provider-key")).toBeNull()
  })

  test("streams tool-call fragments and usage before the upstream finishes", async () => {
    const release = Promise.withResolvers<void>()
    const first =
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"read_file","arguments":"{\\\"path\\\":"}}]}}]}\n\n'
    const last =
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\\"index.ts\\\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"total_tokens":10}}\n\ndata: [DONE]\n\n'
    const app = fixture(async (request) => {
      expect(await request.json()).toEqual({
        ...payload,
        stream: true,
        stream_options: { include_usage: true },
        model: "actual-coder",
      })
      return new Response(
        new ReadableStream({
          start(stream) {
            stream.enqueue(new TextEncoder().encode(first))
            void release.promise.then(() => {
              stream.enqueue(new TextEncoder().encode(last))
              stream.close()
            })
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      )
    })
    const response = await app.post({ ...payload, stream: true, stream_options: { include_usage: true } })
    expect(response.status).toBe(200)
    const reader = response.body!.getReader()
    expect(new TextDecoder().decode((await reader.read()).value)).toBe(first)
    release.resolve()
    const rest = await new Response(
      new ReadableStream({
        async pull(stream) {
          const next = await reader.read()
          if (next.done) return stream.close()
          stream.enqueue(next.value)
        },
      }),
    ).text()
    expect(rest).toBe(last)
  })

  test.each([
    ["restricted", 403, "region_denied"],
    ["unknown", 404, "model_not_found"],
    ["__proto__", 404, "model_not_found"],
  ])("rejects model %s without making an upstream request", async (model, status, code) => {
    let calls = 0
    const app = fixture(() => {
      calls++
      return Response.json({})
    })
    const response = await app.post({ ...payload, model }, { "x-pp-region": "global" })
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
    expect(calls).toBe(0)
  })

  test.each([
    [null, 400],
    [{ ...payload, messages: [] }, 400],
    [{ ...payload, messages: [null] }, 400],
    [{ ...payload, stream: "true" }, 400],
    [{ ...payload, messages: [{ role: "user", content: "x".repeat(2048) }] }, 413],
  ])("rejects malformed or oversized input %#", async (body, status) => {
    const app = fixture(() => Response.json({ unexpected: true }), { maxRequestBytes: 1024 })
    const response = await app.post(body)
    expect(response.status).toBe(status)
    await response.body?.cancel()
  })

  test("rejects invalid JSON and unsupported media types", async () => {
    const app = fixture(() => Response.json({ unexpected: true }))
    const invalid = await fetch(new URL("v1/chat/completions", app.url), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{invalid",
    })
    expect(invalid.status).toBe(400)
    expect((await app.post(payload, { "content-type": "text/plain" })).status).toBe(415)
  })

  test.each([
    [400, 400],
    [401, 502],
    [403, 502],
    [429, 429],
    [500, 502],
  ])("sanitizes upstream status %i", async (upstreamStatus, expected) => {
    const app = fixture(() => new Response(`Secret ${upstreamKey}`, { status: upstreamStatus }))
    const response = await app.post(payload)
    expect(response.status).toBe(expected)
    const message = await response.text()
    expect(message).not.toContain(upstreamKey)
    expect(message).not.toContain(token)
  })

  test("never follows an upstream redirect or forwards its credential", async () => {
    let redirected = 0
    const target = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => {
        redirected++
        return Response.json({})
      },
    })
    servers.push(target)
    const app = fixture(() => new Response(null, { status: 307, headers: { location: target.url.href } }))
    expect((await app.post(payload)).status).toBe(502)
    expect(redirected).toBe(0)
  })

  test("rejects a successful response with unexpected content type", async () => {
    const app = fixture(() => new Response("provider login page", { headers: { "content-type": "text/html" } }))
    const response = await app.post(payload)
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: "invalid_upstream_response" } })
  })

  test("aborting a streaming client cancels the upstream connection", async () => {
    const cancelled = Promise.withResolvers<void>()
    const app = fixture((request) => {
      request.signal.addEventListener("abort", () => cancelled.resolve(), { once: true })
      return new Response(
        new ReadableStream({
          start(stream) {
            stream.enqueue(new TextEncoder().encode('data: {"choices":[]}\n\n'))
          },
          cancel() {
            cancelled.resolve()
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      )
    })
    const controller = new AbortController()
    const response = await fetch(new URL("v1/chat/completions", app.url), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...payload, stream: true }),
      signal: controller.signal,
    })
    const reader = response.body!.getReader()
    expect((await reader.read()).done).toBe(false)
    controller.abort()
    await cancelled.promise
    await reader.cancel().catch(() => {})
  })
})

describe("operator configuration", () => {
  const env = { PP_ROUTER_API_KEY: token, UPSTREAM_KEY: upstreamKey }
  const base = {
    region: "cn",
    models: {
      coding: {
        ...capabilities,
        baseURL: "https://example.com/v1",
        upstreamModel: "coder",
        apiKeyEnv: "UPSTREAM_KEY",
        regions: ["cn"],
      },
    },
  }

  test("fails closed for missing credentials or invalid region policy", () => {
    expect(() => configure(base, {})).toThrow("PP_ROUTER_API_KEY")
    expect(() => configure(base, { PP_ROUTER_API_KEY: token })).toThrow("upstream API key")
    expect(() => configure({ ...base, region: "global" }, env)).toThrow("No configured models")
    expect(() => configure({ ...base, region: "other" }, env)).toThrow("region must be")
  })

  test.each([
    "http://provider.example/v1",
    "https://user:secret@example.com/v1",
    "https://example.com/v1?api_key=secret",
  ])("rejects insecure or credential-bearing endpoint %s", (baseURL) => {
    expect(() => configure({ ...base, models: { coding: { ...base.models.coding, baseURL } } }, env)).toThrow(
      "HTTPS baseURL",
    )
  })
})
