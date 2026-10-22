import { createHash } from "node:crypto"

export type Region = "cn" | "global"
export type Route = {
  baseURL: string
  upstreamModel: string
  apiKeyEnv: string
  apiKey: string
  regions: Region[]
  contextWindow: number
  maxOutputTokens: number
  toolCalling: boolean
}
export type Config = {
  region: Region
  hostname: string
  port: number
  maxRequestBytes: number
  timeoutMs: number
  tokenHash: Buffer
  models: Map<string, Route>
}

export class ConfigError extends Error {}

export async function loadConfig(path: string, env: Record<string, string | undefined> = process.env) {
  const value = await Bun.file(path)
    .json()
    .catch(() => {
      throw new ConfigError("Unable to read router configuration JSON")
    })
  return configure(value, env)
}

/** Decode operator-owned configuration once, keeping secret values out of diagnostics. */
export function configure(value: unknown, env: Record<string, string | undefined>): Config {
  if (!record(value)) throw new ConfigError("Router configuration must be an object")
  if (!region(value.region)) throw new ConfigError("region must be cn or global")
  const deploymentRegion = value.region
  const token = env.PP_ROUTER_API_KEY
  if (!token || token.length < 32 || /\s/.test(token)) {
    throw new ConfigError("PP_ROUTER_API_KEY must contain at least 32 non-whitespace characters")
  }
  const hostname = value.hostname ?? "127.0.0.1"
  if (typeof hostname !== "string" || !hostname || /[\s/]/.test(hostname)) {
    throw new ConfigError("hostname must be a hostname or IP address")
  }
  const models = value.models
  if (!record(models) || !Object.keys(models).length) throw new ConfigError("models must contain at least one alias")
  const routes = Object.entries(models).map(([alias, model]) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(alias) || !record(model)) {
      throw new ConfigError("Each model needs a valid alias and configuration")
    }
    if (typeof model.baseURL !== "string") throw new ConfigError(`Model ${alias} needs baseURL`)
    const url = URL.parse(model.baseURL)
    if (
      !url ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    ) {
      throw new ConfigError(`Model ${alias} needs an HTTPS baseURL (HTTP is allowed only on loopback)`)
    }
    if (typeof model.upstreamModel !== "string" || !model.upstreamModel.trim() || /[\r\n]/.test(model.upstreamModel)) {
      throw new ConfigError(`Model ${alias} needs upstreamModel`)
    }
    if (typeof model.apiKeyEnv !== "string" || !/^[A-Z_][A-Z0-9_]*$/.test(model.apiKeyEnv)) {
      throw new ConfigError(`Model ${alias} needs an apiKeyEnv environment variable name`)
    }
    if (!Array.isArray(model.regions) || !model.regions.length || !model.regions.every(region)) {
      throw new ConfigError(`Model ${alias} needs a nonempty regions allowlist`)
    }
    const apiKey = env[model.apiKeyEnv] ?? ""
    if (model.regions.includes(deploymentRegion) && (!apiKey || /[\r\n]/.test(apiKey))) {
      throw new ConfigError(`Model ${alias} is missing a valid upstream API key in its configured environment variable`)
    }
    const contextWindow = integer(model.contextWindow, `Model ${alias} contextWindow`, 1024, 100_000_000)
    const maxOutputTokens = integer(model.maxOutputTokens, `Model ${alias} maxOutputTokens`, 1, contextWindow)
    if (typeof model.toolCalling !== "boolean") throw new ConfigError(`Model ${alias} needs a toolCalling boolean`)
    return [
      alias,
      {
        baseURL: url.href.replace(/\/$/, ""),
        upstreamModel: model.upstreamModel,
        apiKeyEnv: model.apiKeyEnv,
        apiKey,
        regions: model.regions,
        contextWindow,
        maxOutputTokens,
        toolCalling: model.toolCalling,
      },
    ] as const
  })
  if (!routes.some(([, route]) => route.regions.includes(deploymentRegion))) {
    throw new ConfigError("No configured models permit this deployment region")
  }
  return {
    region: deploymentRegion,
    hostname,
    port: integer(value.port ?? 8787, "port", 0, 65535),
    maxRequestBytes: integer(value.maxRequestBytes ?? 2_097_152, "maxRequestBytes", 1024, 67_108_864),
    timeoutMs: integer(value.timeoutMs ?? 180_000, "timeoutMs", 1000, 3_600_000),
    tokenHash: createHash("sha256").update(token).digest(),
    models: new Map(routes),
  }
}

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function region(value: unknown): value is Region {
  return value === "cn" || value === "global"
}

function integer(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}`)
  }
  return value
}
