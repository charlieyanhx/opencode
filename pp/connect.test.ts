import { expect, test } from "bun:test"
import { browserLink } from "./connect"

test("PP provisions a browser session without putting the workspace password in the link", async () => {
  const requests: { url: string; method: string; authorization: string | null }[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requests.push({ url: request.url, method: request.method, authorization: request.headers.get("authorization") })
      return Response.json({ code: "single-use-code", expires_in: 300 })
    },
  })
  try {
    expect(await browserLink(server.url.href, "http://127.0.0.1:4444", "workspace-secret")).toBe(
      "http://127.0.0.1:4444/auth/connect/single-use-code",
    )
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0]!.url).pathname).toBe("/api/pair")
    expect(requests[0]!.method).toBe("POST")
    expect(requests[0]!.authorization).toBe(`Basic ${btoa("opencode:workspace-secret")}`)
  } finally {
    server.stop(true)
  }
})

test.each([401, 503])("PP does not create a connection link when the server returns %s", async (status) => {
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response(null, { status }) })
  try {
    await expect(browserLink(server.url.href, "http://127.0.0.1:4444", "workspace-secret")).rejects.toThrow(
      `PP workspace connection failed (${status})`,
    )
  } finally {
    server.stop(true)
  }
})
