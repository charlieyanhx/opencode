import { createSignal, lazy, Show, Suspense } from "solid-js"
import { Command, Slot, TitlebarItem, type Setup } from "../sdk"
import type Debug from "./index"

const setup: Setup<typeof Debug> = (ctx) => {
  const DebugBar = lazy(() => import("./bar"))
  const channel = ctx.build.channel
  // Window-local; every window starts with the bar hidden.
  const [visible, setVisible] = createSignal(false)

  const toggle = () => {
    setVisible((value) => !value)
  }

  ctx.add(
    Command,
    (): Command => ({
      id: "toggle",
      title: ctx.t("command.toggle"),
      group: ctx.t("command.category.view"),
      run: toggle,
    }),
  )

  ctx.add(Slot, {
    at: "window.bottom",
    render: () => (
      <Show when={visible()}>
        <Suspense>
          <DebugBar diagnostics={import.meta.env.DEV} inline />
        </Suspense>
      </Show>
    ),
  })

  // PP builds ship without a release channel, so keep developer tools out of their titlebar.
  if ((channel !== "dev" && channel !== "local") || import.meta.env.VITE_PP_ENABLED === "true") return
  ctx.add(
    TitlebarItem,
    (): TitlebarItem => ({
      id: "toggle",
      placement: "channel",
      label: ctx.t("status.toggle"),
      pressed: visible(),
      run: toggle,
    }),
  )
}

export default setup
