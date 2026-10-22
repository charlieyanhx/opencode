import { describe, expect, test } from "bun:test"
import { configure } from "./router/src/config"
import { openCodeConfig, routerModelFromEnv, sharedRouterConfig } from "./opencode"

describe("OpenCode router configuration", () => {
  test("uses the existing PP router's automatic routing policy directly", () => {
    const result = sharedRouterConfig("http://127.0.0.1:4000/v1/")
    expect(result.model).toBe("pp/auto")
    expect(result.providers.pp.settings).toEqual({
      baseURL: "http://127.0.0.1:4000/v1",
      apiKey: "{env:PP_ROUTER_API_KEY}",
    })
    expect(result.providers.pp.models.auto.capabilities.tools).toBe(true)
    expect(result.providers.pp.models.auto.limit).toEqual({ context: 16384, output: 4096 })
    expect(result.policies).toEqual([
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "pp", effect: "allow" },
    ])
  })

  test("pins one router model with its declared limits from the launcher environment", () => {
    const model = routerModelFromEnv({
      PP_ROUTER_MODEL: "glm-5.1",
      PP_ROUTER_CONTEXT_TOKENS: "131072",
      PP_ROUTER_OUTPUT_TOKENS: "16384",
    })
    const result = sharedRouterConfig("https://router.example.cn/v1", model)
    expect(result.model).toBe("pp/glm-5.1")
    expect(result.providers.pp.models["glm-5.1"].limit).toEqual({ context: 131072, output: 16384 })
    expect(routerModelFromEnv({})).toEqual({ id: "auto", context: 16384, output: 4096 })
    expect(() => routerModelFromEnv({ PP_ROUTER_MODEL: "pp/../auto" })).toThrow()
    expect(() => routerModelFromEnv({ PP_ROUTER_CONTEXT_TOKENS: "lots" })).toThrow()
  })

  test("exposes only regional aliases and public model metadata", () => {
    const model = {
      baseURL: "https://example.invalid/v1",
      upstreamModel: "private-model",
      apiKeyEnv: "UPSTREAM_KEY",
      contextWindow: 65536,
      maxOutputTokens: 4096,
      toolCalling: true,
    }
    const config = configure(
      {
        region: "cn",
        models: {
          coding: { ...model, regions: ["cn"] },
          overseas: { ...model, regions: ["global"] },
        },
      },
      { PP_ROUTER_API_KEY: "test-router-token-32-characters-long", UPSTREAM_KEY: "secret-upstream-token" },
    )
    const result = openCodeConfig(config, "http://127.0.0.1:8787/v1")
    expect(result.model).toBe("pp/coding")
    expect(Object.keys(result.providers.pp.models)).toEqual(["coding"])
    expect(result.providers.pp.models.coding.limit).toEqual({ context: 65536, output: 4096 })
    expect(result.providers.pp.models.coding.capabilities).toEqual({
      tools: true,
      input: ["text"],
      output: ["text"],
    })
    expect(result.providers.pp.settings.apiKey).toBe("{env:PP_ROUTER_API_KEY}")
    expect(JSON.stringify(result)).not.toContain("secret-upstream-token")
    expect(JSON.stringify(result)).not.toContain("private-model")
    expect(result.share).toBe("disabled")
  })

  test.each(["http://remote.example/v1", "https://user:password@example.com", "https://example.com?key=secret"])(
    "rejects unsafe gateway URL %s",
    (baseURL) => {
      const config = configure(
        {
          region: "global",
          models: {
            coding: {
              baseURL: "https://example.invalid/v1",
              upstreamModel: "coding",
              apiKeyEnv: "UPSTREAM_KEY",
              regions: ["global"],
              contextWindow: 32768,
              maxOutputTokens: 4096,
              toolCalling: true,
            },
          },
        },
        { PP_ROUTER_API_KEY: "test-router-token-32-characters-long", UPSTREAM_KEY: "upstream" },
      )
      expect(() => openCodeConfig(config, baseURL)).toThrow("PP_ROUTER_BASE_URL")
      expect(() => sharedRouterConfig(baseURL)).toThrow("PP_ROUTER_BASE_URL")
    },
  )
})
