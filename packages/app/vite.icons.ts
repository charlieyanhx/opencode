import { readFileSync } from "node:fs"
import type { Plugin } from "vite"
import manifest from "./manifest.json" with { type: "json" }

export function icons(channel: string): Plugin {
  const pp = process.env.VITE_PP_ENABLED === "true"
  const selected = channel === "beta" || channel === "prod" ? channel : "dev"
  const prefix = pp ? "icons/pp" : `icons/${selected}`

  const files = [
    ...Object.entries(
      pp
        ? {
            "favicon.svg": "mark.svg",
            "apple-touch-icon.png": "apple-touch-icon.png",
            "web-app-manifest-192x192.png": "icon-192.png",
            "web-app-manifest-512x512.png": "icon-512.png",
          }
        : {
            "favicon.ico": "icon.ico",
            "apple-touch-icon.png": "ios/AppIcon-60x60@3x.png",
            "web-app-manifest-192x192.png": "android/mipmap-xxxhdpi/ic_launcher.png",
            "web-app-manifest-512x512.png": "icon.png",
          },
    ).map(([name, source]) => ({
      fileName: `${prefix}/${name}`,
      source: readFileSync(
        new URL(pp ? `./icons/pp/${source}` : `../desktop/icons/${selected}/${source}`, import.meta.url),
      ),
      type: name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".ico") ? "image/x-icon" : "image/png",
    })),
    {
      fileName: "site.webmanifest",
      source: JSON.stringify({
        ...manifest,
        ...(pp ? { name: "PP Code", short_name: "PP Code", theme_color: "#191919", background_color: "#191919" } : {}),
        icons: manifest.icons.map((icon) => ({ ...icon, src: `/${prefix}${icon.src}` })),
      }),
      type: "application/manifest+json",
    },
  ]

  return {
    name: "opencode-app:icons",
    generateBundle() {
      files.forEach((file) => this.emitFile({ type: "asset", fileName: file.fileName, source: file.source }))
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = files.find((file) => `/${file.fileName}` === request.url?.split("?")[0])

        if (!file) return next()
        response.setHeader("Content-Type", file.type)
        response.end(file.source)
      })
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const branded = pp
          ? html
              .replace("<title>OpenCode</title>", "<title>PP Code</title>")
              .replace('rel="icon" type="image/x-icon"', 'rel="icon" type="image/svg+xml"')
              .replaceAll('content="/social-share.png"', `content="/${prefix}/web-app-manifest-512x512.png"`)
          : html

        return branded
          .replace("%OPENCODE_FAVICON%", `/${prefix}/favicon.${pp ? "svg" : "ico"}`)
          .replace("%OPENCODE_APPLE_TOUCH_ICON%", `/${prefix}/apple-touch-icon.png`)
      },
    },
  }
}
