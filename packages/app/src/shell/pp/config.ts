export function suiteLink(value: string | undefined) {
  if (!value?.trim()) return undefined
  const url = URL.parse(value)

  if (!url || !["https:", "http:"].includes(url.protocol) || url.username || url.password) return undefined

  return url.href
}

/** PP branding applies to web builds made with `VITE_PP_ENABLED=true`; desktop and upstream builds keep their own. */
export function ppEnabled(platform: { platform: string }) {
  return import.meta.env.VITE_PP_ENABLED === "true" && platform.platform === "web"
}

/** Help opens the configured PP help page in PP builds, which hide Help when none is set. */
export function helpLink(platform: { platform: string }) {
  if (!ppEnabled(platform)) return "https://opencode.ai/desktop-feedback"

  return suiteLink(import.meta.env.VITE_PP_HELP_URL)
}

// The built-in upstream skills describe the upstream product and file bug reports against its repository.
const upstreamSkills = new Set(["opencode", "report"])

export function offeredSkill(skill: { id: string }) {
  return import.meta.env.VITE_PP_ENABLED !== "true" || !upstreamSkills.has(skill.id)
}
