import { createHash, timingSafeEqual } from "node:crypto"
import { fileURLToPath } from "node:url"
import { loadConfig, ConfigError, record } from "./config"
import type { Config } from "./config"

export function start(config: Config) {
  return Bun.serve({
    hostname: config.hostname,
    port: config.port,
    maxRequestBodySize: config.maxRequestBytes,
    // The explicit request deadline below owns long-lived model streams.
    idleTimeout: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      if (path === "/health" && request.method === "GET") {
        return Response.json({ status: "ok", region: config.region }, { headers: { "cache-control": "no-store" } })
      }
      if (!authenticated(request, config)) return error(401, "unauthorized", "A valid PP router API key is required")
      if (path === "/v1/models" && request.method === "GET") {
        return Response.json(
          {
            object: "list",
            data: [...config.models]
              .filter(([, route]) => route.regions.includes(config.region))
              .map(([id]) => ({ id, object: "model", created: 0, owned_by: "pp" })),
          },
          { headers: { "cache-control": "no-store" } },
        )
      }
      if (path !== "/v1/chat/completions") return error(404, "not_found", "Endpoint not found")
      if (request.method !== "POST") return error(405, "method_not_allowed", "Use POST for chat completions")
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return error(415, "invalid_content_type", "Use application/json")
      }
      try {
        return await complete(request, config)
      } catch (cause) {
        if (cause instanceof RequestError) return error(cause.status, cause.code, cause.message)
        // Never forward provider exception messages, URLs or response bodies: they may contain credentials.
        return error(502, "upstream_unavailable", "The configured model endpoint is unavailable")
      }
    },
    error() {
      return error(500, "router_error", "The router could not complete the request")
    },
  })
}

function authenticated(request: Request, config: Config) {
  const authorization = request.headers.get("authorization") ?? ""
  const candidate = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
  return timingSafeEqual(createHash("sha256").update(candidate).digest(), config.tokenHash)
}

async function complete(request: Request, config: Config) {
  const body = await readBody(request, config.maxRequestBytes)
  if (!record(body) || typeof body.model !== "string" || !Array.isArray(body.messages) || !body.messages.length) {
    throw new RequestError(400, "invalid_request", "Provide a model alias and a nonempty messages array")
  }
  if (body.messages.some((message) => !record(message) || typeof message.role !== "string")) {
    throw new RequestError(400, "invalid_request", "Each message needs a role")
  }
  if (body.stream !== undefined && typeof body.stream !== "boolean") {
    throw new RequestError(400, "invalid_request", "stream must be a boolean")
  }
  const route = config.models.get(body.model)
  if (!route) throw new RequestError(404, "model_not_found", "The requested model alias is not configured")
  if (!route.regions.includes(config.region)) {
    throw new RequestError(403, "region_denied", "This model is not allowed in the deployment region")
  }
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(config.timeoutMs)])
  const upstream = await fetch(`${route.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${route.apiKey}` },
    // Keep tool calls, multimodal messages, stream_options and provider extensions intact.
    body: JSON.stringify({ ...body, model: route.upstreamModel }),
    redirect: "manual",
    signal,
  })
  if (!upstream.ok) {
    await upstream.body?.cancel()
    if (upstream.status === 429)
      throw new RequestError(429, "upstream_rate_limited", "The model endpoint is rate limited")
    if (upstream.status === 400 || upstream.status === 422) {
      throw new RequestError(400, "upstream_rejected_request", "The model endpoint rejected the request parameters")
    }
    throw new RequestError(502, "upstream_error", "The model endpoint returned an unsuccessful response")
  }
  const contentType = upstream.headers.get("content-type") ?? ""
  if (!(body.stream ? contentType.startsWith("text/event-stream") : contentType.startsWith("application/json"))) {
    await upstream.body?.cancel()
    throw new RequestError(502, "invalid_upstream_response", "The model endpoint returned an unexpected content type")
  }
  if (!upstream.body)
    throw new RequestError(502, "invalid_upstream_response", "The model endpoint returned an empty response")
  const reader = upstream.body.getReader()
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(stream) {
        try {
          const next = await reader.read()
          if (next.done) return stream.close()
          stream.enqueue(next.value)
        } catch {
          controller.abort()
          // An interrupted stream must fail, never appear to be a successful truncated completion.
          stream.error(new Error("Model stream interrupted"))
        }
      },
      async cancel() {
        controller.abort()
        await reader.cancel().catch(() => {})
      },
    }),
    {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
        "x-accel-buffering": "no",
        "x-pp-region": config.region,
        "x-pp-model-alias": body.model,
        "x-pp-upstream-model": route.upstreamModel,
      },
    },
  )
}

async function readBody(request: Request, limit: number): Promise<unknown> {
  const length = request.headers.get("content-length")
  if (length !== null && Number(length) > limit)
    throw new RequestError(413, "request_too_large", "Request body is too large")
  if (!request.body) throw new RequestError(400, "invalid_json", "A JSON body is required")
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new RequestError(413, "request_too_large", "Request body is too large")
      }
      chunks.push(next.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch (cause) {
    if (cause instanceof RequestError) throw cause
    throw new RequestError(400, "invalid_json", "Request body must be valid JSON")
  } finally {
    reader.releaseLock()
  }
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

function error(status: number, code: string, message: string) {
  return Response.json(
    { error: { message, type: code, code } },
    {
      status,
      headers: { "cache-control": "no-store", ...(status === 401 ? { "www-authenticate": "Bearer" } : {}) },
    },
  )
}

if (import.meta.main) {
  try {
    const path = process.env.PP_ROUTER_CONFIG ?? fileURLToPath(new URL("../config.example.json", import.meta.url))
    const config = await loadConfig(path)
    const server = start(config)
    console.info(`PP model router listening on ${server.url} (${config.region})`)
    process.once("SIGTERM", () => server.stop(true))
    process.once("SIGINT", () => server.stop(true))
  } catch (cause) {
    console.error(
      cause instanceof ConfigError ? cause.message : "Unable to load or start PP router; check configuration",
    )
    process.exitCode = 1
  }
}
