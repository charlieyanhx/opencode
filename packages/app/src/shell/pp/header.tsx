import { A, useLocation } from "@solidjs/router"
import { For, Show } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import { useSettingsSurface } from "@/settings/surface"
import { useSettingsServers } from "@/settings/servers/inventory"
import { suiteLink } from "./config"
import { PPWordmark } from "./wordmark"
import "./style.css"

export function PPSuiteHeader() {
  const language = useLanguage()
  const settings = useSettingsSurface()
  const servers = useSettingsServers()
  const location = useLocation()

  const links = [
    { href: suiteLink(import.meta.env.VITE_PP_HOME_URL), label: "pp.suite" },
    { href: suiteLink(import.meta.env.VITE_PP_CHAT_URL), label: "pp.chat" },
    { href: suiteLink(import.meta.env.VITE_PP_FLOW_URL), label: "pp.flow" },
  ] as const

  return (
    <header class="pp-suite" dir={language.direction()}>
      <A class="pp-brand" href="/" aria-label={language.t("pp.code")}>
        <PPWordmark compact decorative class="pp-mark" />
        <span>{language.t("pp.code")}</span>
      </A>
      <nav class="pp-navigation" aria-label={language.t("pp.navigation")}>
        <A href="/" data-active={location.pathname !== "/settings" ? "true" : undefined}>
          {language.t("pp.workspace")}
        </A>
        <For each={links}>
          {(link) => <Show when={link.href}>{(href) => <a href={href()}>{language.t(link.label)}</a>}</Show>}
        </For>
      </nav>
      <div class="pp-controls">
        <button
          type="button"
          onClick={() => settings.open("general")}
          aria-current={settings.active() ? "page" : undefined}
        >
          {language.t("sidebar.settings")}
        </button>
        <Show
          when={servers().length > 1}
          fallback={
            <button
              type="button"
              disabled={!servers().length}
              onClick={() => {
                const server = servers()[0]

                if (server) settings.openServer(server.key, "models")
              }}
            >
              {language.t("settings.models.title")}
            </button>
          }
        >
          <select
            aria-label={language.t("settings.models.title")}
            value=""
            onChange={(event) => {
              const server = servers().find((item) => item.key === event.currentTarget.value)

              if (server) settings.openServer(server.key, "models")
              event.currentTarget.value = ""
            }}
          >
            <option value="" disabled>
              {language.t("settings.models.title")}
            </option>
            <For each={servers()}>{(server) => <option value={server.key}>{server.name}</option>}</For>
          </select>
        </Show>
        <select
          aria-label={language.t("settings.general.row.language.title")}
          value={language.locale()}
          onChange={(event) => {
            const next = language.locales.find((locale) => locale === event.currentTarget.value)

            if (next) language.setLocale(next)
          }}
        >
          <For each={language.locales}>{(locale) => <option value={locale}>{language.label(locale)}</option>}</For>
        </select>
      </div>
    </header>
  )
}
