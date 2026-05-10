import type { TranscriptSegment } from "./types.ts"

interface Json3Event {
  tStartMs: number
  dDurationMs?: number
  segs?: Array<{ utf8: string }>
  aAppend?: number
}

interface Json3Subs {
  events: Json3Event[]
}

export function parseJson3(raw: string): TranscriptSegment[] | Error {
  let data: Json3Subs
  try {
    data = JSON.parse(raw)
  } catch {
    return new Error("Failed to parse JSON3 subtitle data")
  }

  if (!data.events || !Array.isArray(data.events)) {
    return new Error("Invalid JSON3 format: missing events array")
  }

  const segments: TranscriptSegment[] = []

  for (const event of data.events) {
    if (event.aAppend) continue
    if (!event.segs || event.segs.length === 0) continue

    const text = event.segs
      .map((s) => s.utf8)
      .join("")
      .trim()

    if (!text) continue

    const start = event.tStartMs / 1000
    const end = event.dDurationMs != null
      ? (event.tStartMs + event.dDurationMs) / 1000
      : start + 1

    segments.push({ start, end, text })
  }

  if (segments.length === 0) {
    return new Error("No transcript segments found in JSON3 data")
  }

  return segments
}
