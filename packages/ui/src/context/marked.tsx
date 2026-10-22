import { getSharedHighlighter } from "@pierre/diffs"
import { bundledLanguages, type BundledLanguage } from "shiki"
import { createSimpleContext } from "./helper"
import { createMarkdownParser } from "./marked-parser"
import { registerOpenCodeTheme } from "./marked-theme-register"
import { SHIKI_THEME } from "./marked-theme"

export { OpenCodeTheme } from "./marked-theme"

registerOpenCodeTheme()

export const { use: useMarked, provider: MarkedProvider } = createSimpleContext({
  name: "Marked",
  init: () =>
    createMarkdownParser(async (code, language) => {
      const highlighter = await getSharedHighlighter({
        themes: [SHIKI_THEME],
        langs: [],
        preferredHighlighter: "shiki-wasm",
      })

      const name = language in bundledLanguages ? language : "text"

      if (!highlighter.getLoadedLanguages().includes(name)) await highlighter.loadLanguage(name as BundledLanguage)

      return highlighter.codeToHtml(code, {
        lang: name,
        theme: SHIKI_THEME,
        tabindex: false,
      })
    }),
})
