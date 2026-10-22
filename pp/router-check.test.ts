import { afterAll, describe, expect, test } from "bun:test"
import { checkRouter } from "./router-check"

const key = "router-check-test-key-32-characters"

// A loopback router that answers like the PP router's OpenAI-compatible API.
const server = Bun.serve({
  port: 0,
  async fetch(request) {
    if (request.headers.get("authorization") !== `Bearer ${key}`) return new Response("{}", { status: 401 })
    const url = new URL(request.url)
    if (url.pathname === "/v1/models")
      return Response.json({ object: "list", data: [{ id: "auto" }, { id: "glm-5.1" }] })
    const body = (await request.json()) as { messages: { role: string }[] }
    const hasToolResult = body.messages.some((message) => message.role === "tool")
    const chunks = hasToolResult
      ? [{ choices: [{ delta: { content: "A tiny demo project." } }] }]
      : [
          {
            choices: [
              {
                delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: '{"pa' } }] },
              },
            ],
          },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'th":"README.md"}' } }] } }] },
        ]
    const sse = [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"].join("")
    return new Response(sse, { headers: { "content-type": "text/event-stream" } })
  },
})
afterAll(() => server.stop(true))

describe("PP router acceptance check", () => {
  test("passes a router that streams tool calls and continues after tool results", async () => {
    const steps = await checkRouter({ baseURL: `${server.url.origin}/v1`, apiKey: key, model: "auto" })
    expect(steps.map((step) => [step.name, step.ok])).toEqual([
      ["Rejects a wrong key", true],
      ["Lists the model", true],
      ["Streams a tool call", true],
      ["Answers after the tool result", true],
    ])
  })

  test("fails clearly when the model is not offered or the key is wrong", async () => {
    const missing = await checkRouter({ baseURL: `${server.url.origin}/v1`, apiKey: key, model: "qwen3-coder-plus" })
    expect(missing.find((step) => step.name === "Lists the model")?.ok).toBe(false)
    const unauthorized = await checkRouter({ baseURL: `${server.url.origin}/v1`, apiKey: "wrong", model: "auto" })
    expect(unauthorized.find((step) => step.name === "Streams a tool call")?.ok).toBe(false)
    const unreachable = await checkRouter({ baseURL: "http://127.0.0.1:9/v1", apiKey: key, model: "auto" })
    expect(unreachable.map((step) => [step.name, step.ok])).toEqual([["Reaches the router", false]])
  })
})
