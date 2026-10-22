/**
 * PP builds name PP Code where upstream copy names the upstream product, its hosted services or its CLI,
 * and correct two Chinese About lines that misread the license and typesetting credits.
 * The upstream dictionaries stay byte-for-byte unchanged; these values replace them only in PP builds.
 * Keys absent from a locale's override keep that locale's own text, so every key here needs zh and zht values.
 */
const en = {
  "settings.about.license": "Released under the MIT License",
  "settings.about.typeset": "Typeset in Inter and IBM Plex Mono",
  "command.provider.connect.description": "Connect a model provider",
  "dialog.model.unpaid.freeModels.title": "Free models",
  "provider.connect.opencode.name": "Hosted models",
  "provider.connect.opencode.freeName": "Free models",
  "provider.connect.opencode.errorTitle": "Connect provider",
  "provider.connect.console.title": "Connecting provider",
  "provider.connect.console.titleGo": "Connecting provider",
  "provider.connect.console.intro": "Sign in with your account to use the available models.",
  "provider.connect.console.serviceKeyDescription": "Connect using a service-account API key.",
  "provider.connect.console.connected": "Provider connected",
  "provider.connect.chatgptWelcome.description": "Eligible requests in PP Code can use your ChatGPT plan.",
  "provider.connect.remote.description":
    "Your provider credentials will be stored on this server. Models will be available through this server.",
  "provider.connect.apiKey.description":
    "Enter your {{provider}} API key to connect your account and use {{provider}} models in PP Code.",
  "server.connect.link.invalid": "Paste the full pairing link from Settings → Pairing on the server's computer.",
  "server.connect.link.legacy":
    "This pairing code is from an older server version. Ask your PP Code administrator to update the server.",
  "server.connect.link.expired":
    "This pairing link expired or was already used. Ask your PP Code administrator for a new one.",
  "server.connect.password.hint": "Ask your PP Code administrator for the server password.",
  "server.connect.scan.description": "Point your camera at the pairing QR code.",
  "server.connect.scan.invalid": "This is not a PP Code pairing code.",
  "server.row.incompatible":
    "This server version ({{version}}) isn't compatible with this app. Upgrade the server to continue.",
  "session.error.incompatible.description":
    "{{server}} is running an incompatible version ({{version}}). Upgrade the server to continue.",
  "error.page.report.prefix": "If this keeps happening, contact your PP Code administrator.",
  "error.page.report.discord": "",
  "error.chain.checkConfig": "Check the provider and model names in the server configuration",
  "error.chain.mcpFailed": 'MCP server "{{name}}" failed. MCP authentication is not supported yet.',
  "settings.about.firstPublished": "",
  "settings.about.website": "",
  "settings.about.description": "PP Code, the coding workspace in PP Suite.",
  "settings.about.trademark": "",
  "settings.about.copyright": "",
  "settings.about.notices.description": "PP Code includes the following open source software.",
  "settings.extensions.manageConfig": "Managed in the server configuration",
  "project.settings.name.description": "The name shown for this project throughout PP Code",
  "project.settings.extensions.empty.mcps.description": "MCPs available in this workspace will appear here",
  "project.settings.extensions.empty.plugins.description": "Plugins available in this workspace will appear here",
  "project.settings.extensions.empty.skills.description": "Skills available in this workspace will appear here",
  "settings.general.row.language.description": "Change the display language for PP Code",
  "settings.general.row.colorScheme.description": "Choose whether PP Code follows the system, light, or dark theme",
  "settings.general.row.theme.description": "Customize how PP Code looks.",
  "settings.workspaces.empty.description": "Worktrees you create will appear here",
  "dialog.usageExceeded.freeTier.description":
    "You have used the free allowance. Connect another provider to continue.",
}

type Overrides = Record<keyof typeof en, string>

const zh: Overrides = {
  "settings.about.license": "基于 MIT 许可证发布",
  "settings.about.typeset": "使用 Inter 和 IBM Plex Mono 排版",
  "command.provider.connect.description": "连接模型提供商",
  "dialog.model.unpaid.freeModels.title": "免费模型",
  "provider.connect.opencode.name": "托管模型",
  "provider.connect.opencode.freeName": "免费模型",
  "provider.connect.opencode.errorTitle": "连接提供商",
  "provider.connect.console.title": "正在连接提供商",
  "provider.connect.console.titleGo": "正在连接提供商",
  "provider.connect.console.intro": "登录你的账户以使用可用模型。",
  "provider.connect.console.serviceKeyDescription": "使用服务账户 API 密钥连接。",
  "provider.connect.console.connected": "提供商已连接",
  "provider.connect.chatgptWelcome.description": "PP Code 中符合条件的请求可以使用你的 ChatGPT 套餐。",
  "provider.connect.remote.description": "你的提供商凭据将存储在此服务器上。模型将通过此服务器提供。",
  "provider.connect.apiKey.description":
    "输入你的 {{provider}} API 密钥以连接账户，并在 PP Code 中使用 {{provider}} 模型。",
  "server.connect.link.invalid": "粘贴服务器电脑上“设置 → 配对”中的完整配对链接。",
  "server.connect.link.legacy": "此配对码来自较旧的服务器版本。请让 PP Code 管理员更新服务器。",
  "server.connect.link.expired": "此配对链接已过期或已被使用。请向 PP Code 管理员获取新的链接。",
  "server.connect.password.hint": "请向 PP Code 管理员获取服务器密码。",
  "server.connect.scan.description": "将摄像头对准配对二维码。",
  "server.connect.scan.invalid": "这不是 PP Code 配对码。",
  "server.row.incompatible": "此服务器版本（{{version}}）与此应用不兼容。请升级服务器以继续。",
  "session.error.incompatible.description": "{{server}} 正在运行不兼容的版本（{{version}}）。请升级服务器以继续。",
  "error.page.report.prefix": "如果问题持续出现，请联系 PP Code 管理员。",
  "error.page.report.discord": "",
  "error.chain.checkConfig": "请检查服务器配置中的 provider/model 名称",
  "error.chain.mcpFailed": 'MCP 服务器 "{{name}}" 启动失败。暂不支持 MCP 认证。',
  "settings.about.firstPublished": "",
  "settings.about.website": "",
  "settings.about.description": "PP Code，PP Suite 中的编程工作区。",
  "settings.about.trademark": "",
  "settings.about.copyright": "",
  "settings.about.notices.description": "PP Code 包含以下开源软件。",
  "settings.extensions.manageConfig": "在服务器配置中管理",
  "project.settings.name.description": "此项目在 PP Code 中显示的名称",
  "project.settings.extensions.empty.mcps.description": "此工作区可用的 MCP 将显示在这里",
  "project.settings.extensions.empty.plugins.description": "此工作区可用的插件将显示在这里",
  "project.settings.extensions.empty.skills.description": "此工作区可用的技能将显示在这里",
  "settings.general.row.language.description": "更改 PP Code 的显示语言",
  "settings.general.row.colorScheme.description": "选择 PP Code 跟随系统、浅色或深色主题",
  "settings.general.row.theme.description": "自定义 PP Code 的外观。",
  "settings.workspaces.empty.description": "你创建的工作树将显示在此处",
  "dialog.usageExceeded.freeTier.description": "免费额度已用完。请连接其他提供商以继续。",
}

const zht: Overrides = {
  "settings.about.license": "依據 MIT 授權條款發布",
  "settings.about.typeset": "使用 Inter 與 IBM Plex Mono 排版",
  "command.provider.connect.description": "連接模型提供者",
  "dialog.model.unpaid.freeModels.title": "免費模型",
  "provider.connect.opencode.name": "託管模型",
  "provider.connect.opencode.freeName": "免費模型",
  "provider.connect.opencode.errorTitle": "連接提供者",
  "provider.connect.console.title": "正在連接提供者",
  "provider.connect.console.titleGo": "正在連接提供者",
  "provider.connect.console.intro": "登入你的帳戶以使用可用模型。",
  "provider.connect.console.serviceKeyDescription": "使用服務帳戶 API 金鑰連線。",
  "provider.connect.console.connected": "提供者已連線",
  "provider.connect.chatgptWelcome.description": "PP Code 中符合資格的請求可以使用你的 ChatGPT 方案。",
  "provider.connect.remote.description": "你的提供者憑證將儲存在此伺服器上。模型將透過此伺服器提供。",
  "provider.connect.apiKey.description":
    "輸入你的 {{provider}} API 金鑰以連線帳戶，並在 PP Code 中使用 {{provider}} 模型。",
  "server.connect.link.invalid": "貼上伺服器電腦上「設定 → 配對」中的完整配對連結。",
  "server.connect.link.legacy": "此配對碼來自較舊的伺服器版本。請讓 PP Code 管理員更新伺服器。",
  "server.connect.link.expired": "此配對連結已過期或已被使用。請向 PP Code 管理員取得新的連結。",
  "server.connect.password.hint": "請向 PP Code 管理員取得伺服器密碼。",
  "server.connect.scan.description": "將相機對準配對 QR 碼。",
  "server.connect.scan.invalid": "這不是 PP Code 配對碼。",
  "server.row.incompatible": "此伺服器版本（{{version}}）與此應用程式不相容。請升級伺服器以繼續。",
  "session.error.incompatible.description": "{{server}} 正在執行不相容的版本（{{version}}）。請升級伺服器以繼續。",
  "error.page.report.prefix": "如果問題持續發生，請聯絡 PP Code 管理員。",
  "error.page.report.discord": "",
  "error.chain.checkConfig": "請檢查伺服器設定中的 provider/model 名稱",
  "error.chain.mcpFailed": "MCP 伺服器「{{name}}」啟動失敗。尚不支援 MCP 驗證。",
  "settings.about.firstPublished": "",
  "settings.about.website": "",
  "settings.about.description": "PP Code，PP Suite 中的程式設計工作區。",
  "settings.about.trademark": "",
  "settings.about.copyright": "",
  "settings.about.notices.description": "PP Code 包含下列開放原始碼軟體。",
  "settings.extensions.manageConfig": "在伺服器設定中管理",
  "project.settings.name.description": "此專案在 PP Code 中顯示的名稱",
  "project.settings.extensions.empty.mcps.description": "此工作區可用的 MCP 會顯示在此",
  "project.settings.extensions.empty.plugins.description": "此工作區可用的外掛程式會顯示在此",
  "project.settings.extensions.empty.skills.description": "此工作區可用的技能會顯示在此",
  "settings.general.row.language.description": "變更 PP Code 的顯示語言",
  "settings.general.row.colorScheme.description": "選擇 PP Code 跟隨系統、淺色或深色主題",
  "settings.general.row.theme.description": "自訂 PP Code 的外觀。",
  "settings.workspaces.empty.description": "你建立的工作樹將顯示在此處",
  "dialog.usageExceeded.freeTier.description": "免費額度已用完。請連接其他提供者以繼續。",
}

/** The locales with reviewed PP copy. PP builds offer only these; other stored or detected locales fall back to English. */
export const PP_LOCALES = ["en", "zh", "zht"] as const

export type PPLocale = (typeof PP_LOCALES)[number]

const overrides: Record<PPLocale, Overrides> = { en, zh, zht }

export function isPPLocale(locale: string): locale is PPLocale {
  return PP_LOCALES.some((value) => value === locale)
}

export function ppDictionary<Dictionary extends object>(locale: PPLocale, dictionary: Dictionary) {
  // SAFETY: every override key exists in the source dictionaries (pp.test.ts) and replaces a string with a string.
  return { ...dictionary, ...overrides[locale] } as Dictionary
}
