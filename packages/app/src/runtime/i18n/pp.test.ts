import { describe, expect, test } from "bun:test"
import { flatten } from "@solid-primitives/i18n"
import { dict as uiEn } from "@opencode/ui/i18n/en"
import { dict as uiZh } from "@opencode/ui/i18n/zh"
import { dict as uiZht } from "@opencode/ui/i18n/zht"
import en from "./en"
import { dict as zh } from "./zh"
import { dict as zht } from "./zht"
import { PP_LOCALES, ppDictionary } from "./pp"

const upstream = /open\s?code|anomaly|discord|missouri/i

// Desktop-only copy never renders in the PP web build; worktree hints name environment variables the server sets.
const exempt = (key: string) => key.startsWith("desktop.") || key.startsWith("project.settings.worktree.startup.hint.")

const base: Record<string, string> = flatten({ ...en, ...uiEn })

const dictionaries = {
  en: base,
  zh: { ...base, ...flatten({ ...zh, ...uiZh }) },
  zht: { ...base, ...flatten({ ...zht, ...uiZht }) },
}

describe("PP copy", () => {
  test.each([...PP_LOCALES])("%s names no upstream product, service or community", (locale) => {
    const leaks = Object.entries(ppDictionary(locale, dictionaries[locale]))
      .filter(([key, value]) => !exempt(key) && upstream.test(value))
      .map(([key]) => key)

    expect(leaks).toEqual([])
  })

  test.each(["zh", "zht"] as const)("%s translates every English key", (locale) => {
    const own = { ...(locale === "zh" ? { ...zh, ...uiZh } : { ...zht, ...uiZht }), ...ppDictionary(locale, {}) }
    const untranslated = Object.keys(base).filter((key) => !exempt(key) && !(key in own))

    expect(untranslated).toEqual([])
  })

  test("overrides only keys the source dictionaries define", () => {
    const added = Object.keys(ppDictionary("en", {})).filter((key) => !(key in base))

    expect(added).toEqual([])
  })
})
