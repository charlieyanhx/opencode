import { registerCustomTheme } from "@pierre/diffs"
import { OpenCodeTheme, SHIKI_THEME } from "./marked-theme"

let registered = false

export function registerOpenCodeTheme() {
  if (registered) return
  registered = true
  registerCustomTheme(SHIKI_THEME, () => Promise.resolve(OpenCodeTheme))
}
