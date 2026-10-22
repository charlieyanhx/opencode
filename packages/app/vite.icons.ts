import { readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "vite"
import manifest from "./manifest.json" with { type: "json" }

const upstreamPublicFiles = [
  "apple-touch-icon.png",
  "apple-touch-icon-v3.png",
  "favicon.ico",
  "favicon.svg",
  "favicon-v3.ico",
  "favicon-v3.svg",
  "favicon-96x96.png",
  "favicon-96x96-v3.png",
  "social-share.png",
  "social-share-zen.png",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png",
  // Inlined into index.html, so the standalone copy is unused.
  "oc-theme-preload.js",
]

export function icons(channel: string): Plugin {
  const pp = process.env.VITE_PP_ENABLED === "true"
  const selected = channel === "beta" || channel === "prod" ? channel : "dev"
  const prefix = pp ? "icons/pp" : `icons/${selected}`

  const files = [
    ...Object.entries(
      pp
        ? {
            "favicon.svg": "mark.svg",
            "apple-touch-icon.png": "logo-authentic.png",
            "logo-authentic.png": "logo-authentic.png",
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
        icons: pp
          ? [{ src: `/${prefix}/favicon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }]
          : manifest.icons.map((icon) => ({ ...icon, src: `/${prefix}${icon.src}` })),
      }),
      type: "application/manifest+json",
    },
  ]

  return {
    name: "opencode-app:icons",
    generateBundle() {
      files.forEach((file) => this.emitFile({ type: "asset", fileName: file.fileName, source: file.source }))
    },
    // PP builds link only PP icons; drop the upstream ones copied from `public/` before the service worker precaches.
    writeBundle(options) {
      const dir = options.dir

      if (!pp || !dir) return
      upstreamPublicFiles.forEach((name) => rmSync(join(dir, name), { force: true }))
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        // Module imports such as `logo.png?import` must reach Vite's asset pipeline, not raw bytes.
        const [pathname, query] = request.url?.split("?") ?? []

        if (query !== undefined && new URLSearchParams(query).has("import")) return next()
        const file = files.find((file) => `/${file.fileName}` === pathname)

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
              .replaceAll('content="/social-share.png"', `content="/${prefix}/logo-authentic.png"`)
          : html

        return branded
          .replace("%OPENCODE_FAVICON%", `/${prefix}/favicon.${pp ? "svg" : "ico"}`)
          .replace("%OPENCODE_APPLE_TOUCH_ICON%", `/${prefix}/apple-touch-icon.png`)
      },
    },
  }
}
