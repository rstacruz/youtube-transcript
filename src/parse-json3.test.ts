import { describe, it } from "node:test"
import assert from "node:assert"
import { parseJson3 } from "./parse-json3.ts"
import type { TranscriptSegment } from "./types.ts"

describe("parseJson3", () => {
  it("parses JSON3 events into segments", () => {
    const raw = JSON.stringify({
      events: [
        {
          tStartMs: 1200,
          dDurationMs: 2160,
          segs: [{ utf8: "hello" }, { utf8: " world" }],
        },
      ],
    })

    const result = parseJson3(raw) as TranscriptSegment[]
    assert.equal(result.length, 1)
    assert.equal(result[0].start, 1.2)
    assert.equal(result[0].end, 3.36)
    assert.equal(result[0].text, "hello world")
  })

  it("skips aAppend events", () => {
    const raw = JSON.stringify({
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "first" }],
        },
        {
          tStartMs: 3000,
          segs: [{ utf8: "\n" }],
          aAppend: 1,
        },
        {
          tStartMs: 3000,
          dDurationMs: 2000,
          segs: [{ utf8: "second" }],
        },
      ],
    })

    const result = parseJson3(raw) as TranscriptSegment[]
    assert.equal(result.length, 2)
    assert.equal(result[0].text, "first")
    assert.equal(result[1].text, "second")
  })

  it("returns error on invalid JSON", () => {
    const result = parseJson3("not json")
    assert.ok(result instanceof Error)
  })

  it("returns error on missing events array", () => {
    const result = parseJson3("{}")
    assert.ok(result instanceof Error)
    assert.match((result as Error).message, /missing events array/)
  })

  it("returns error on empty events", () => {
    const result = parseJson3(JSON.stringify({ events: [] }))
    assert.ok(result instanceof Error)
  })

  it("handles empty segs", () => {
    const raw = JSON.stringify({
      events: [
        { tStartMs: 1000, dDurationMs: 1000, segs: [] },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: "text" }] },
      ],
    })

    const result = parseJson3(raw) as TranscriptSegment[]
    assert.equal(result.length, 1)
    assert.equal(result[0].text, "text")
  })
})
