# PP browser shell

Enabled only for the web platform with `VITE_PP_ENABLED=true`. Set optional
`VITE_PP_HOME_URL`, `VITE_PP_CHAT_URL`, `VITE_PP_FLOW_URL` and `VITE_PP_HELP_URL` to absolute HTTP(S)
destinations. Missing, credential-bearing and non-web URLs are omitted.

The shell reuses OpenCode's semantic theme tokens, settings surface and persisted
language context. Adding a locale follows the existing app/UI dictionary registry;
missing PP keys use the existing English fallback. The shell performs no runtime
machine translation and does not send UI strings or documents to a translation API.

## Localization review notes

The user explicitly requested language support including Chinese. English source
keys live in `runtime/i18n/en.ts`; Chinese additions are in `runtime/i18n/zh.ts`.
`工作区`, `模型`, and `语言` reuse established terms in that existing Chinese corpus.
PP, PP Code, PP Suite, PP Chat and PP Flow are retained product names in all locales.

References checked for interface language terminology and fallback conventions:

- [Microsoft display language documentation](https://code.visualstudio.com/docs/configure/locales)
- [Microsoft Chinese language settings](https://support.microsoft.com/zh-cn/office/检查或更改语言设置-d594c982-8151-24b9-e25d-54c986b22f6d)
- [Mozilla Chinese language settings](https://support.mozilla.org/zh-CN/products/firefox/settings/languages)
- [Mozilla Chinese preferences corpus](https://github.com/mozilla-l10n/firefox-l10n/blob/main/zh-CN/browser/browser/preferences/preferences.ftl)

The new aria label `PP 套件导航` should receive native-speaker product review with
the final suite naming. No count-sensitive strings or interpolation were added.
These source checks are not a claim of independent human linguistic review.

### Demo language pass — 2026-10-21

English, Simplified Chinese (`zh`) and Traditional Chinese (`zht`) now cover every
`pp.*` source key, including home, About, language, appearance and project settings.
The only values intentionally identical to English are the five PP product names
and the PP abbreviation. Other locales continue to use the existing English
fallback for PP additions; they are not claimed as fully localized PP demos.

Terminology was cross-checked against the existing app dictionaries, Microsoft's
[VS Code Traditional Chinese corpus](https://github.com/microsoft/vscode-loc/blob/main/i18n/vscode-language-pack-zh-hant/translations/main.i18n.json),
[Firefox Traditional Chinese preferences](https://github.com/mozilla-l10n/firefox-l10n/blob/main/zh-TW/browser/browser/preferences/preferences.ftl),
[Mozilla Simplified Chinese settings](https://support.mozilla.org/zh-CN/products/firefox/settings/languages),
and [Apple Taiwan language settings](https://support.apple.com/zh-tw/guide/mac-help/intl163/mac).
Traditional Chinese keeps `專案`, `工作階段`, `工作區`, `字型` and `佈景主題`
consistent with the app's existing labels; Simplified Chinese keeps `项目`, `会话`,
`工作区`, `字体` and `主题`. Marketing headlines and the product term `模型路由`
remain candidates for native-speaker polish; no independent human review is claimed.

The header's Settings button opens the existing internal settings surface. It does
not navigate to an external PP site or replace the persisted language preference.

### White-label copy pass — 2026-10-22

`runtime/i18n/pp.ts` replaces upstream product, hosted-service and CLI names in en, zh
and zht. Chinese values reuse the existing corpus terms: `提供商`/`提供者` for provider,
`服务器`/`伺服器`, `配对`/`配對`, `工作区`/`工作區` and `工作树`/`工作樹`. The PP About
lines that misread "MIT License" as `麻省理工学院许可证` and the typesetting credit were
corrected. `托管模型`/`託管模型` (hosted models) and `PP Code 管理员`/`管理員`
(administrator) are new terms and need native-speaker review. No independent human
review is claimed.
