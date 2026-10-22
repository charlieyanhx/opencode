import { describe, expect, test } from "bun:test"
import { sessionLabel, sessionTitle } from "./title"

const zh = (key: "session.title.new" | "session.title.child") =>
  key === "session.title.new" ? "新会话" : "子会话"

describe("session titles", () => {
  test("localize server fallbacks when a translator is given", () => {
    expect(sessionLabel({ title: undefined, parentID: undefined }, zh)).toBe("新会话")
    expect(sessionLabel({ title: undefined, parentID: "ses_parent" }, zh)).toBe("子会话")
    expect(sessionTitle("New session - 2026-07-30T18:45:03.662Z", zh)).toBe("新会话")
    expect(sessionTitle("Child session - 2026-07-30T18:45:03.662Z", zh)).toBe("子会话")
  })

  test("keep English fallbacks without a translator", () => {
    expect(sessionLabel({ title: undefined, parentID: undefined })).toBe("New session")
    expect(sessionTitle("New session - 2026-07-30T18:45:03.662Z")).toBe("New session")
  })

  test("show titles the user chose as written", () => {
    expect(sessionLabel({ title: "New session", parentID: undefined }, zh)).toBe("New session")
    expect(sessionTitle("修复批量订单折扣", zh)).toBe("修复批量订单折扣")
  })
})
