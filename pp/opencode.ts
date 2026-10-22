import type { Config } from "./router/src/config"

/** Project only public model metadata; upstream credentials belong to the router. */
export function openCodeConfig(config: Config, baseURL: string) {
  const models = [...config.models].filter(([, route]) => route.regions.includes(config.region))
  return providerConfig(
    baseURL,
    Object.fromEntries(
      models.map(([alias, route]) => [
        alias,
        {
          name: alias,
          capabilities: { tools: route.toolCalling, input: ["text"], output: ["text"] },
          limit: { context: route.contextWindow, output: route.maxOutputTokens },
        },
      ]),
    ),
    "Standalone Gateway",
  )
}

export type RouterModel = { id: string; context: number; output: number }

// Conservative integration limits; the router also enforces its configured output cap.
const defaultRouterModel: RouterModel = { id: "auto", context: 16384, output: 4096 }

/** Use the original PP router's automatic policy, including its provider fallbacks, or one router model ID. */
export function sharedRouterConfig(baseURL: string, model: RouterModel = defaultRouterModel) {
  return providerConfig(
    baseURL,
    {
      [model.id]: {
        name: model.id === "auto" ? "PP Auto" : model.id,
        capabilities: { tools: true, input: ["text"], output: ["text"] },
        limit: { context: model.context, output: model.output },
      },
    },
    "PP Model Router",
  )
}

/** Read the optional PP_ROUTER_MODEL, PP_ROUTER_CONTEXT_TOKENS and PP_ROUTER_OUTPUT_TOKENS overrides. */
export function routerModelFromEnv(env: Record<string, string | undefined>): RouterModel {
  const id = env.PP_ROUTER_MODEL?.trim() || defaultRouterModel.id
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id))
    throw new Error("PP_ROUTER_MODEL must be a router model ID such as auto or glm-5.1")
  return {
    id,
    context: tokens(env.PP_ROUTER_CONTEXT_TOKENS, defaultRouterModel.context, "PP_ROUTER_CONTEXT_TOKENS"),
    output: tokens(env.PP_ROUTER_OUTPUT_TOKENS, defaultRouterModel.output, "PP_ROUTER_OUTPUT_TOKENS"),
  }
}

function tokens(value: string | undefined, fallback: number, name: string) {
  if (!value?.trim()) return fallback
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < 1024) throw new Error(`${name} must be a whole number of at least 1024`)
  return result
}

function providerConfig(
  baseURL: string,
  models: Record<
    string,
    {
      name: string
      capabilities: { tools: boolean; input: string[]; output: string[] }
      limit: { context: number; output: number }
    }
  >,
  name: string,
) {
  const url = URL.parse(baseURL)
  if (
    !url ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
  ) {
    throw new Error("PP_ROUTER_BASE_URL must use HTTPS or loopback HTTP without credentials, query, or fragment")
  }
  const first = Object.keys(models)[0]
  if (!first) throw new Error("No models are available in this deployment region")
  return {
    model: `pp/${first}`,
    update: "disable",
    share: "disabled",
    policies: [
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "pp", effect: "allow" },
    ],
    providers: {
      pp: {
        name,
        package: "@ai-sdk/openai-compatible",
        settings: {
          baseURL: url.href.replace(/\/$/, ""),
          apiKey: "{env:PP_ROUTER_API_KEY}",
        },
        models,
      },
    },
  }
}
