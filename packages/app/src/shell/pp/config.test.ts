import { describe, expect, test } from "bun:test"
import { suiteLink } from "./config"

describe("PP suite links", () => {
  test.each([
    undefined,
    "",
    " ",
    "/relative",
    "javascript:alert(1)",
    "data:text/html,hi",
    "https://user:secret@example.com",
  ])("hides absent or unsafe link %s", (value) => expect(suiteLink(value)).toBeUndefined())

  test("preserves a configured app destination without adding authentication data", () => {
    expect(suiteLink("https://suite.example.cn/chat?workspace=demo")).toBe(
      "https://suite.example.cn/chat?workspace=demo",
    )
    expect(suiteLink("http://localhost:3001")).toBe("http://localhost:3001/")
  })
})
