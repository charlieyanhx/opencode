import type { Config } from "./router/src/config"

/** Project only public model metadata; upstream credentials belong to the router. */
export function openCodeConfig(config: Config, baseURL: string) {
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
  const models = [...config.models].filter(([, route]) => route.regions.includes(config.region))
  if (!models.length) throw new Error("No models are available in this deployment region")
  return {
    model: `pp/${models[0][0]}`,
    update: "disable",
    share: "disabled",
    policies: [
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "pp", effect: "allow" },
    ],
    providers: {
      pp: {
        name: "PP Model Router",
        package: "@ai-sdk/openai-compatible",
        settings: {
          baseURL: url.href.replace(/\/$/, ""),
          apiKey: "{env:PP_ROUTER_API_KEY}",
        },
        models: Object.fromEntries(
          models.map(([alias, route]) => [
            alias,
            {
              name: alias,
              capabilities: { tools: route.toolCalling, input: ["text"], output: ["text"] },
              limit: { context: route.contextWindow, output: route.maxOutputTokens },
            },
          ]),
        ),
      },
    },
  }
}
