import { Show } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import mark from "../../../icons/pp/mark.svg"
import "./wordmark.css"

export function PPWordmark(props: { compact?: boolean; decorative?: boolean; class?: string }) {
  const language = useLanguage()

  return (
    <div
      class={`pp-wordmark ${props.class ?? ""}`}
      role="img"
      aria-label={props.decorative ? undefined : language.t("pp.code")}
      aria-hidden={props.decorative || undefined}
    >
      <img class="pp-wordmark-icon" src={mark} alt="" />
      <Show when={!props.compact}>
        <span class="pp-wordmark-name">{language.t("pp.code")}</span>
      </Show>
    </div>
  )
}
