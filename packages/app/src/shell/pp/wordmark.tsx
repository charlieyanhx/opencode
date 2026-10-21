import { useLanguage } from "@/runtime/i18n/language"
import logo from "../../../icons/pp/logo-authentic.png"
import chineseLogo from "../../../icons/pp/logo-authentic-zh.png"
import mark from "../../../icons/pp/mark.svg"
import "./wordmark.css"

export function PPWordmark(props: { compact?: boolean; decorative?: boolean; class?: string }) {
  const language = useLanguage()

  return (
    <div
      class={`pp-wordmark ${props.class ?? ""}`}
      classList={{ "pp-wordmark-compact": props.compact }}
      role="img"
      aria-label={props.decorative ? undefined : language.t("pp.code")}
      aria-hidden={props.decorative || undefined}
    >
      <img
        class="pp-wordmark-icon"
        src={props.compact ? mark : language.locale().startsWith("zh") ? chineseLogo : logo}
        alt=""
      />
    </div>
  )
}
