import type { TranscriptSegment } from "./types.ts"

const CUE_RE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/

function parseTimestamp(h: string, m: string, s: string, ms: string): number {
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000
}

function stripVttText(text: string): string {
  return text
    .replace(/<c>/g, "")
    .replace(/<\/c>/g, "")
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
    .replace(/align:start position:\d+%/g, "")
    .trim()
}

export function parseVtt(raw: string): TranscriptSegment[] | Error {
  const lines = raw.split("\n")
  const segments: TranscriptSegment[] = []
  let currentStart = -1
  let currentEnd = -1
  let textBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "WEBVTT" || line.startsWith("Kind:") || line.startsWith("Language:")) {
      continue
    }

    if (line === "") {
      if (currentStart >= 0 && textBuffer.length > 0) {
        const text = stripVttText(textBuffer.join(" ").trim())
        if (text) {
          segments.push({ start: currentStart, end: currentEnd, text })
        }
        currentStart = -1
        currentEnd = -1
        textBuffer = []
      }
      continue
    }

    const match = CUE_RE.exec(line)
    if (match) {
      currentStart = parseTimestamp(match[1], match[2], match[3], match[4])
      currentEnd = parseTimestamp(match[5], match[6], match[7], match[8])
      continue
    }

    if (currentStart >= 0) {
      textBuffer.push(line)
    }
  }

  if (currentStart >= 0 && textBuffer.length > 0) {
    const text = stripVttText(textBuffer.join(" ").trim())
    if (text) {
      segments.push({ start: currentStart, end: currentEnd, text })
    }
  }

  if (segments.length === 0) {
    return new Error("No transcript segments found in VTT data")
  }

  return segments
}
