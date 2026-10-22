import { Logo } from "@opencode/ui/logo"
import { Show } from "solid-js"
import { PPWordmark } from "@/shell/pp/wordmark"
import "./wordmark.css"

export function NewSessionWordmark(props: { pp?: boolean }) {
  return (
    <Show
      when={props.pp}
      fallback={
        <div
          data-component="new-session-wordmark"
          aria-hidden="true"
          class="pointer-events-none mx-auto w-full max-w-[720px] text-v2-background-bg-inverse"
        >
          <div data-slot="wordmark-reveal" class="relative mx-auto w-4/5">
            <Logo class="block aspect-[720/129] w-full opacity-[0.16]" />
            <Logo class="wordmark-shimmer absolute inset-0 aspect-[720/129] w-full" />
          </div>
        </div>
      }
    >
      <PPWordmark decorative class="pointer-events-none mx-auto w-full max-w-[720px]" />
    </Show>
  )
}
