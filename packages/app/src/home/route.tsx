import { ScrollView } from "@opencode/ui/scroll-view"
import { Button } from "@opencode/ui/button"
import { createMediaQuery } from "@solid-primitives/media"
import { usePlatform } from "@/runtime/platform/platform"
import { Show } from "solid-js"
import { createHomeController } from "./model"
import { createHomeProjectsController } from "./projects/controller"
import { HomeUtilityNav } from "./projects/view"
import { HomeProjects } from "./projects/region"
import { createHomeScrollController } from "./scroll"
import { createHomeSessionSearchController } from "./sessions/search"
import { createHomeSessionsController } from "./sessions/controller"
import { HomeSessions } from "./sessions/region"
import { PPWordmark } from "@/shell/pp/wordmark"
import "./pp.css"

export function Home() {
  const platform = usePlatform()
  const pp = import.meta.env.VITE_PP_ENABLED === "true" && platform.platform === "web"
  const mobile = createMediaQuery("(max-width: 767px)")
  const home = createHomeController()
  const projects = createHomeProjectsController(home)
  const sessions = createHomeSessionsController(home)
  const search = createHomeSessionSearchController(home, sessions)
  const scroll = createHomeScrollController(sessions.data.groups)

  return (
    <div
      data-slot="home-panel"
      class={`
        mx-[var(--shell-inline-inset,8px)] mb-[var(--shell-bottom-inset,8px)] mt-[var(--shell-top-inset,8px)] flex min-h-0 flex-1 flex-col self-stretch overflow-hidden rounded-[10px]
        bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]
      `}
    >
      <Show when={mobile()}>
        <div class="relative z-40 -mb-3 shrink-0 px-3 pt-3">
          <HomeProjects projects={projects} scroll={scroll} dropdown />
        </div>
      </Show>
      <ScrollView
        class="min-h-0 flex-1 [container-type:size]"
        thumbContainer={scroll.viewport.thumbTrack()}
        thumbHoverTarget={scroll.viewport.hoverTarget()}
        viewportRef={scroll.viewport.setViewport}
        onScroll={(event) => scroll.viewport.update(event.currentTarget.scrollTop)}
        onWheel={scroll.viewport.containOuterWheel}
      >
        <Show when={pp}>
          <section class="pp-home-intro" aria-labelledby="pp-home-title">
            <div class="pp-home-heading">
              <div class="pp-home-eyebrow">
                <PPWordmark compact decorative class="pp-home-symbol" />
                <span>{projects.copy.language.t("pp.home.eyebrow")}</span>
              </div>
              <h1 id="pp-home-title">{projects.copy.language.t("pp.home.title")}</h1>
              <p>{projects.copy.language.t("pp.home.description")}</p>
              <div class="pp-home-actions">
                <Show when={home.server.focused()}>
                  {(server) => (
                    <Button
                      variant="neutral"
                      size="large"
                      icon="folder"
                      disabled={home.server.health(server())?.healthy === false}
                      onClick={() => projects.project.choose(server())}
                    >
                      {projects.copy.language.t("command.project.open")}
                    </Button>
                  )}
                </Show>
                <Show when={sessions.session.canCreate()}>
                  <Button variant="ghost-muted" size="large" icon="edit" onClick={sessions.session.create}>
                    {projects.copy.language.t("command.session.new")}
                  </Button>
                </Show>
              </div>
            </div>
            <div class="pp-home-notes">
              <div>
                <span class="pp-home-note-marker" aria-hidden="true" />
                <strong>{projects.copy.language.t("pp.home.routing")}</strong>
                <p>{projects.copy.language.t("pp.home.routing.description")}</p>
              </div>
              <div>
                <span class="pp-home-note-marker" aria-hidden="true" />
                <strong>{projects.copy.language.t("pp.home.language")}</strong>
                <p>{projects.copy.language.t("pp.home.language.description")}</p>
              </div>
            </div>
          </section>
        </Show>
        <div
          class={`
            mx-auto grid min-h-full w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)] gap-4 px-3
            max-md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,720px)] lg:grid-rows-1 lg:gap-8 lg:px-6
          `}
        >
          <Show when={!mobile()}>
            <HomeProjects projects={projects} scroll={scroll} />
          </Show>
          <HomeSessions sessions={sessions} search={search} scroll={scroll} />
        </div>
      </ScrollView>
      <div class="hidden shrink-0 px-3 py-2 md:block lg:hidden">
        <HomeUtilityNav
          class="flex"
          onOpenSettings={projects.utility.settings}
          onOpenHelp={projects.utility.help}
          language={projects.copy.language}
        />
      </div>
    </div>
  )
}
