// The launcher keeps the server password; the browser receives a single-use link
// which the backend exchanges for its existing HttpOnly session cookie.
export async function browserLink(server: string, browser: string, password: string, signal?: AbortSignal) {
  const response = await fetch(new URL("/api/pair", server), {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`opencode:${password}`)}` },
    signal,
  })
  if (!response.ok) throw new Error(`PP workspace connection failed (${response.status})`)
  const pair: unknown = await response.json()
  if (!pair || typeof pair !== "object" || !("code" in pair) || typeof pair.code !== "string" || !pair.code) {
    throw new Error("PP workspace returned an invalid connection link")
  }
  return new URL(`/auth/connect/${encodeURIComponent(pair.code)}`, browser).href
}
