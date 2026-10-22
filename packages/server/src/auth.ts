export * as ServerAuth from "./auth"

import { Context, Layer, Option, Redacted } from "effect"
import { createHmac, timingSafeEqual } from "node:crypto"

export type DecodedCredentials = {
  readonly username: string
  readonly password: Redacted.Redacted
}

/** The name a server presents in its Basic auth username and session cookie. Downstream products set their own. */
export type Brand = "opencode" | "pp"

export type Info = {
  readonly password: Option.Option<string>
  readonly username: string
  readonly brand?: Brand
}

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export class Config extends Context.Service<Config, Info>()("@opencode/ServerAuthConfig") {
  static configLayer(input: Pick<Info, "password" | "brand">) {
    return Layer.succeed(this, this.of(info(input.password, input.brand)))
  }

  static get layer() {
    return this.configLayer({ password: Option.none() })
  }
}

export function required(config: Info) {
  return Option.isSome(config.password) && config.password.value !== ""
}

export function info(password: Option.Option<string>, brand: Brand = "opencode"): Info {
  return { password, username: brand, brand }
}

// Session tokens issued by pairing links are accepted anywhere the password is.
// A branded server also accepts `opencode`, which existing CLI, TUI and desktop clients send.
export function authorized(credentials: DecodedCredentials, config: Info) {
  if (Option.isNone(config.password)) return false
  if (credentials.username !== config.username && credentials.username !== "opencode") return false
  const password = Redacted.value(credentials.password)
  return password === config.password.value || verifySession(password, config)
}

// Sessions are signed with a key derived from the server password, so rotating the password revokes every session.
export function issueSession(config: Info, now = Date.now()) {
  if (Option.isNone(config.password)) return
  const expires = String(Math.floor(now / 1000) + SESSION_TTL_SECONDS)
  return `${expires}.${sign(config.password.value, expires)}`
}

export function verifySession(token: string, config: Info, now = Date.now()) {
  if (Option.isNone(config.password)) return false
  const parts = token.split(".")
  if (parts.length !== 2) return false
  const expires = Number(parts[0])
  if (!Number.isSafeInteger(expires) || expires * 1000 <= now) return false
  const expected = Buffer.from(sign(config.password.value, parts[0]))
  const actual = Buffer.from(parts[1])
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Browsers share cookies across ports on the same host, so the name carries the port to keep local servers apart.
export function sessionCookieName(host: string | undefined, brand: Brand = "opencode") {
  const port = URL.parse(`http://${host ?? ""}`)?.port
  return port ? `${brand}_session_${port}` : `${brand}_session`
}

// A branded server still reads the upstream cookie, so browsers signed in before the brand was set stay signed in.
export function sessionToken(cookies: Readonly<Record<string, string>>, host: string | undefined, config: Info) {
  return cookies[sessionCookieName(host, config.brand)] ?? cookies[sessionCookieName(host)]
}

function sign(password: string, payload: string) {
  const key = createHmac("sha256", password).update("opencode-session-v1").digest()
  return createHmac("sha256", key).update(payload).digest("base64url")
}
