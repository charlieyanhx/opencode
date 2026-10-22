// Acceptance check for a PP router deployment: the calls PP Code's coding agent depends on.
// Usage: bun run pp:router-check (reads PP_ROUTER_BASE_URL, PP_ROUTER_API_KEY and optional PP_ROUTER_MODEL from pp/.env).

type Step = { name: string; ok: boolean; detail: string }

type ToolCall = { id: string; name: string; arguments: string }

const tool = {
  type: "function",
  function: {
    name: "read_file",
    description: "Read a file from the project.",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
}

export async function checkRouter(input: { baseURL: string; apiKey: string; model: string; fetch?: typeof fetch }) {
  const send = input.fetch ?? fetch
  const base = input.baseURL.replace(/\/$/, "")
  const headers = (key: string) => ({ authorization: `Bearer ${key}`, "content-type": "application/json" })
  const steps: Step[] = []
  const record = (name: string, ok: boolean, detail: string) => steps.push({ name, ok, detail })

  const rejected = await send(`${base}/models`, { headers: headers("not-the-router-key") }).catch(
    (error: Error) => error,
  )
  if (rejected instanceof Error) {
    record("Reaches the router", false, `${base} is unreachable: ${rejected.message}`)
    return steps
  }
  record("Rejects a wrong key", rejected.status === 401, `HTTP ${rejected.status}`)

  const listed = await send(`${base}/models`, { headers: headers(input.apiKey) })
  const ids = listed.ok
    ? (((await listed.json()) as { data?: { id: string }[] }).data?.map((model) => model.id) ?? [])
    : []
  record(
    "Lists the model",
    ids.includes(input.model),
    listed.ok ? `models: ${ids.join(", ") || "none"}` : `HTTP ${listed.status}`,
  )

  const question = {
    role: "user",
    content: "Use the read_file tool to read README.md, then summarise it in one sentence.",
  }
  const first = await stream(send, `${base}/chat/completions`, headers(input.apiKey), {
    model: input.model,
    messages: [question],
    tools: [tool],
    tool_choice: "required",
  })
  const call = first.calls[0]
  const parsed = call ? safeJson(call.arguments) : undefined
  record(
    "Streams a tool call",
    first.done && call?.name === "read_file" && typeof parsed?.path === "string",
    first.error ??
      (call ? `${call.name}(${call.arguments})` : `no tool call; text: ${first.text.slice(0, 80) || "none"}`),
  )

  if (!call) return steps
  const second = await stream(send, `${base}/chat/completions`, headers(input.apiKey), {
    model: input.model,
    messages: [
      question,
      {
        role: "assistant",
        content: first.text || null,
        tool_calls: [{ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } }],
      },
      { role: "tool", tool_call_id: call.id, content: "# Demo\nA tiny project used to check the PP router." },
    ],
    tools: [tool],
  })
  record(
    "Answers after the tool result",
    second.done && second.text.trim().length > 0,
    second.error ?? second.text.slice(0, 120),
  )
  return steps
}

async function stream(send: typeof fetch, url: string, headers: Record<string, string>, body: object) {
  const result = { text: "", calls: [] as ToolCall[], done: false, error: undefined as string | undefined }
  const response = await send(url, { method: "POST", headers, body: JSON.stringify({ ...body, stream: true }) })
  if (!response.ok || !response.body)
    return { ...result, error: `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const partial = new Map<number, ToolCall>()
  let buffer = ""
  while (true) {
    const next = await reader.read()
    if (next.done) break
    buffer += next.value
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines.filter((value) => value.startsWith("data:"))) {
      const data = line.slice(5).trim()
      if (data === "[DONE]") {
        result.done = true
        continue
      }
      const chunk = safeJson(data) as { error?: { message?: string }; choices?: { delta?: Delta }[] } | undefined
      if (chunk?.error) result.error = chunk.error.message ?? "stream error"
      const delta = chunk?.choices?.[0]?.delta
      result.text += delta?.content ?? ""
      for (const piece of delta?.tool_calls ?? []) {
        const call = partial.get(piece.index) ?? { id: "", name: "", arguments: "" }
        partial.set(piece.index, {
          id: piece.id ?? call.id,
          name: piece.function?.name ?? call.name,
          arguments: call.arguments + (piece.function?.arguments ?? ""),
        })
      }
    }
  }
  return { ...result, calls: [...partial.values()] }
}

type Delta = {
  content?: string | null
  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[]
}

function safeJson(value: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

if (import.meta.main) {
  const baseURL = process.env.PP_ROUTER_BASE_URL
  const apiKey = process.env.PP_ROUTER_API_KEY
  if (!baseURL || !apiKey) throw new Error("Set PP_ROUTER_BASE_URL and PP_ROUTER_API_KEY in pp/.env")
  const model = process.env.PP_ROUTER_MODEL?.trim() || "auto"
  const steps = await checkRouter({ baseURL, apiKey, model })
  for (const step of steps) console.log(`${step.ok ? "PASS" : "FAIL"}  ${step.name} — ${step.detail}`)
  const passed = steps.length === 4 && steps.every((step) => step.ok)
  console.log(passed ? `PP router ready for model ${model}.` : "PP router is not ready; fix the failed steps above.")
  process.exitCode = passed ? 0 : 1
}
