// PP builds route models through the PP router, so upstream hosted services and their Console workspaces are never offered.
const upstreamServices = new Set(["opencode", "opencode-go"])

export function offeredProvider(provider: { id: string; integrationID?: string }) {
  if (import.meta.env.VITE_PP_ENABLED !== "true") return true

  return !upstreamServices.has(provider.id) && !upstreamServices.has(provider.integrationID ?? "")
}

export const popularProviders = [
  "opencode-go",
  "opencode",
  "anthropic",
  "github-copilot",
  "openai",
  "google",
  "openrouter",
  "vercel",
].filter((id) => offeredProvider({ id }))
