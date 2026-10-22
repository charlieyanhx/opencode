import type { SessionInfo } from "@opencode/client/promise"
import { displayLabel } from "@opencode/util/session-title-fallback"

const pattern = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

type Translate = (key: "session.title.new" | "session.title.child") => string

// The server names untitled sessions in English; callers that render the label pass a translator.
function localize(label: string, t?: Translate) {
  if (!t) return label
  if (label === "New session") return t("session.title.new")
  if (label === "Child session") return t("session.title.child")
  return label
}

export function sessionLabel(session: Pick<SessionInfo, "title" | "parentID">, t?: Translate) {
  const label = displayLabel(session)
  // A title the user chose is shown as written, even when it reads "New session".
  return label === session.title ? label : localize(label, t)
}

export function sessionTitle(title?: string, t?: Translate) {
  if (!title) return title
  const match = title.match(pattern)

  return match ? localize(match[1], t) : title
}
