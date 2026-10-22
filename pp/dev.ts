import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadConfig } from "./router/src/config"
import { start } from "./router/src/index"
import { openCodeConfig, sharedRouterConfig } from "./opencode"
import { browserLink } from "./connect"

const root = fileURLToPath(new URL("../", import.meta.url))
const mode = process.env.PP_ROUTER_MODE ?? "shared"
if (mode !== "shared" && mode !== "standalone") throw new Error("PP_ROUTER_MODE must be shared or standalone")
const config =
  mode === "standalone"
    ? await loadConfig(path.resolve(root, process.env.PP_ROUTER_CONFIG ?? "pp/router.local.json"))
    : undefined
if (!process.env.PP_ROUTER_API_KEY || process.env.PP_ROUTER_API_KEY.length < 32) {
  throw new Error("Set PP_ROUTER_API_KEY to the existing PP router's PPROUTER_API_KEY (at least 32 characters)")
}
if (!process.env.OPENCODE_PASSWORD || process.env.OPENCODE_PASSWORD.length < 32) {
  throw new Error("Set OPENCODE_PASSWORD to a random password of at least 32 characters in pp/.env")
}
if (process.env.OPENCODE_PASSWORD === process.env.PP_ROUTER_API_KEY) {
  throw new Error("Use different passwords for OpenCode and the model router")
}
if (config && (!["127.0.0.1", "localhost", "::1"].includes(config.hostname) || config.port === 0)) {
  throw new Error("Local development requires a loopback router hostname and a nonzero port")
}
const serverPort = port(process.env.PP_SERVER_PORT, 4096)
const appPort = port(process.env.PP_APP_PORT, 4444)
if (serverPort === appPort || (config && [serverPort, appPort].includes(config.port))) {
  throw new Error("The app, server and router must use different ports")
}
const state = path.join(root, "pp/.local")
const routerHost = config?.hostname === "::1" ? "[::1]" : config?.hostname
const provider = config
  ? openCodeConfig(config, `http://${routerHost}:${config.port}/v1`)
  : sharedRouterConfig(process.env.PP_ROUTER_BASE_URL ?? "")
const sharedURL = new URL(provider.providers.pp.settings.baseURL)
if (
  ["127.0.0.1", "localhost", "[::1]"].includes(sharedURL.hostname) &&
  [serverPort, appPort].includes(Number(sharedURL.port))
) {
  throw new Error("The PP router endpoint cannot use the app or backend port")
}
// Only forward runtime settings. Provider keys from the parent shell stay out of both children.
const allowed = new Set([
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "TERM",
  "TZ",
  "SYSTEMROOT",
  "USERPROFILE",
  "NODE_OPTIONS",
  "GOMEMLIMIT",
  "GOMAXPROCS",
])
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key)))
const backend = {
  ...environment,
  PP_ROUTER_API_KEY: process.env.PP_ROUTER_API_KEY,
  OPENCODE_PASSWORD: process.env.OPENCODE_PASSWORD,
  OPENCODE_SERVER_BRAND: "pp",
  XDG_DATA_HOME: path.join(state, "data"),
  XDG_CACHE_HOME: path.join(state, "cache"),
  XDG_CONFIG_HOME: path.join(state, "config"),
  XDG_STATE_HOME: path.join(state, "state"),
  OPENCODE_CONFIG_DIR: path.join(state, "config/opencode"),
  OPENCODE_CONFIG_PROJECT_DISABLE: "1",
  OPENCODE_DISABLE_CLAUDE_CODE: "1",
  OPENCODE_DISABLE_MODELS_FETCH: "1",
  OPENCODE_DISABLE_AUTOUPDATE: "1",
  OPENCODE_CONFIG_CONTENT: JSON.stringify(provider),
}
// Vite receives public build settings, never the router credential or server password.
const frontend = {
  ...environment,
  VITE_PP_HOME_URL: process.env.VITE_PP_HOME_URL,
  VITE_PP_CHAT_URL: process.env.VITE_PP_CHAT_URL,
  VITE_PP_FLOW_URL: process.env.VITE_PP_FLOW_URL,
  VITE_PP_HELP_URL: process.env.VITE_PP_HELP_URL,
}
const router = config ? start(config) : undefined
const children: Bun.Subprocess[] = []
let stopping = false
function stop() {
  stopping = true
  router?.stop(true)
  for (const child of children) child.kill("SIGTERM")
}
process.once("SIGINT", stop)
process.once("SIGTERM", stop)
try {
  children.push(
    Bun.spawn(
      [
        process.execPath,
        "run",
        "--cwd",
        "packages/cli",
        "src/index.ts",
        "serve",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(serverPort),
        "--cors",
        `http://127.0.0.1:${appPort}`,
      ],
      { cwd: root, env: backend, stdout: "inherit", stderr: "inherit" },
    ),
  )
  children.push(
    Bun.spawn(
      [
        process.execPath,
        "run",
        "--cwd",
        "packages/app",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        String(appPort),
        "--strictPort",
      ],
      {
        cwd: root,
        env: {
          ...frontend,
          VITE_PP_ENABLED: "true",
          VITE_OPENCODE_SERVER_MODE: "origin",
          VITE_OPENCODE_SERVER_HOST: "127.0.0.1",
          VITE_OPENCODE_SERVER_PORT: String(serverPort),
        },
        stdout: "inherit",
        stderr: "inherit",
      },
    ),
  )
  const controller = new AbortController()
  const connected = (async () => {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)])
    const server = `http://127.0.0.1:${serverPort}`
    const browser = `http://127.0.0.1:${appPort}`
    for (let attempt = 0; attempt < 90; attempt++) {
      signal.throwIfAborted()
      const request = AbortSignal.any([signal, AbortSignal.timeout(5000)])
      const ready = await fetch(browser, { signal: request }).then(
        (response) => response.ok,
        () => false,
      )
      if (ready) {
        const link = await browserLink(server, browser, process.env.OPENCODE_PASSWORD!, request).catch(() => undefined)
        if (link) {
          console.log(`Open PP Code: ${link}`)
          console.log(
            "PP connects your workspace automatically. The link expires after five minutes; refresh stays signed in.",
          )
          return
        }
      }
      await Bun.sleep(1000)
    }
    throw new Error("PP workspace did not become ready; check the backend output above")
  })()
  const exited = Promise.race(children.map((child) => child.exited))
  await Promise.race([connected, exited.then(() => controller.abort())])
  const code = await exited
  if (!stopping) process.exitCode = code || 1
} finally {
  stop()
  await Promise.all(children.map((child) => child.exited))
}

function port(value: string | undefined, fallback: number) {
  const result = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(result) || result < 1 || result > 65535) throw new Error("PP ports must be between 1 and 65535")
  return result
}
