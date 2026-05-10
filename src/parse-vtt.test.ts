import { describe, it } from "node:test"
import assert from "node:assert"
import { parseVtt } from "./parse-vtt.ts"
import type { TranscriptSegment } from "./types.ts"

const vttFixture = `WEBVTT
Kind: captions
Language: en

00:00:01.200 --> 00:00:03.360 align:start position:0%

hello world

00:00:05.000 --> 00:00:08.000 align:start position:0%

second<00:00:05.500><c> line</c><00:00:06.000><c> here</c>

`

describe("parseVtt", () => {
  it("parses VTT cues into segments", () => {
    const result = parseVtt(vttFixture) as TranscriptSegment[]
    assert.equal(result.length, 2)
    assert.equal(result[0].start, 1.2)
    assert.equal(result[0].end, 3.36)
    assert.equal(result[0].text, "hello world")
    assert.equal(result[1].start, 5)
    assert.equal(result[1].end, 8)
  })

  it("strips inline <c> tags and timestamps", () => {
    const result = parseVtt(vttFixture) as TranscriptSegment[]
    assert.equal(result[1].text, "second line here")
  })

  it("skips WEBVTT header lines", () => {
    const result = parseVtt(vttFixture) as TranscriptSegment[]
    assert.equal(result.length, 2)
  })

  it("returns error on empty VTT", () => {
    const result = parseVtt("WEBVTT\n\n")
    assert.ok(result instanceof Error)
  })

  it("handles multiple cues", () => {
    const raw = `WEBVTT

00:00:00.000 --> 00:00:01.000

first

00:00:02.000 --> 00:00:03.000

second

00:00:04.000 --> 00:00:05.000

third

`
    const result = parseVtt(raw) as TranscriptSegment[]
    assert.equal(result.length, 3)
    assert.equal(result[0].text, "first")
    assert.equal(result[1].text, "second")
    assert.equal(result[2].text, "third")
  })
})
