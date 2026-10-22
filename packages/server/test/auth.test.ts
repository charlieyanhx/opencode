import { expect, test } from "bun:test"
import { ServerAuth } from "@opencode/server/auth"
import { Option, Redacted } from "effect"

test("accepts only the fixed opencode username", () => {
  const config = { password: Option.some("secret"), username: "opencode" }
  expect(ServerAuth.authorized({ username: "opencode", password: Redacted.make("secret") }, config)).toBe(true)
  expect(ServerAuth.authorized({ username: "custom", password: Redacted.make("secret") }, config)).toBe(false)
})

test("session tokens expire, resist tampering, and are revoked by changing the password", () => {
  const config = { password: Option.some("secret"), username: "opencode" }
  const now = Date.now()
  const token = ServerAuth.issueSession(config, now)
  if (!token) throw new Error("Expected a session token")
  expect(ServerAuth.verifySession(token, config, now)).toBe(true)
  expect(ServerAuth.authorized({ username: "opencode", password: Redacted.make(token) }, config)).toBe(true)
  expect(ServerAuth.verifySession(token, config, now + ServerAuth.SESSION_TTL_SECONDS * 1000)).toBe(false)
  expect(ServerAuth.verifySession(`${token}x`, config, now)).toBe(false)
  const parts = token.split(".")
  expect(ServerAuth.verifySession(`${Number(parts[0]) + 1}.${parts[1]}`, config, now)).toBe(false)
  expect(ServerAuth.verifySession(token, { ...config, password: Option.some("rotated") }, now)).toBe(false)
  expect(ServerAuth.issueSession({ ...config, password: Option.none() })).toBeUndefined()
})

test("a PP-branded server issues PP names and still accepts the upstream ones", () => {
  const config = ServerAuth.info(Option.some("secret"), "pp")
  const login = (username: string) => ServerAuth.authorized({ username, password: Redacted.make("secret") }, config)
  expect([login("pp"), login("opencode"), login("custom")]).toEqual([true, true, false])
  expect(ServerAuth.authorized({ username: "pp", password: Redacted.make("secret") }, ServerAuth.info(Option.some("secret")))).toBe(false)

  expect(ServerAuth.sessionCookieName("127.0.0.1:4096", "pp")).toBe("pp_session_4096")
  expect(ServerAuth.sessionToken({ pp_session_4096: "new", opencode_session_4096: "old" }, "127.0.0.1:4096", config)).toBe("new")
  expect(ServerAuth.sessionToken({ opencode_session_4096: "old" }, "127.0.0.1:4096", config)).toBe("old")
  expect(ServerAuth.sessionToken({ pp_session_4096: "new" }, "127.0.0.1:4096", ServerAuth.info(Option.some("secret")))).toBeUndefined()
})
