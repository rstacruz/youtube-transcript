#!/usr/bin/env -S node --experimental-strip-types

import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"
import { parseJson3 } from "./parse-json3.ts"
import { parseVtt } from "./parse-vtt.ts"
import type { TranscriptSegment } from "./types.ts"

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    lang: { type: "string", short: "l", default: "en" },
    format: { type: "string", short: "f", default: "text" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
})

if (values.help) {
  showHelp()
  process.exit(0)
}

if (values.version) {
  process.stdout.write("youtube-transcript 1.0.0\n")
  process.exit(0)
}

const url = positionals[0]
if (!url) {
  process.stderr.write("error: YouTube URL is required\n")
  showHelp()
  process.exit(1)
}

if (values.format !== "text" && values.format !== "json") {
  process.stderr.write('error: --format must be "text" or "json"\n')
  process.exit(1)
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-transcript-"))
const outFile = path.join(tempDir, "subs")

try {
  const result = await downloadAndParse(url, values.lang as string, outFile)

  if (result instanceof Error) {
    process.stderr.write(`error: ${result.message}\n`)
    process.exit(1)
  }

  if (values.format === "json") {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
  } else {
    for (const seg of result) {
      const ts = formatTimestamp(seg.start)
      process.stdout.write(`[${ts}] ${seg.text}\n`)
    }
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

function showHelp() {
  process.stdout.write(`youtube-transcript 1.0.0

Usage:
  $ youtube-transcript <url> [options]

Options:
  -l, --lang     Subtitle language (default: "en")
  -f, --format   Output format: "text" or "json" (default: "text")
  -h, --help     Display this message
  -v, --version  Display version number
`)
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

async function downloadAndParse(
  url: string,
  lang: string,
  outFile: string,
): Promise<TranscriptSegment[] | Error> {
  for (const fmt of ["json3", "vtt"]) {
    const result = await tryDownload(url, lang, fmt, outFile)
    if (!(result instanceof Error)) return result
  }
  return new Error("No transcript available for this video")
}

function tryDownload(
  url: string,
  lang: string,
  format: string,
  outFile: string,
): Promise<TranscriptSegment[] | Error> {
  return new Promise((resolve) => {
    const args = [
      "--write-auto-sub",
      "--sub-lang", lang,
      "--sub-format", format,
      "--skip-download",
      "-o", outFile,
      url,
    ]

    const proc = spawn("yt-dlp", args, { stdio: ["ignore", "ignore", "pipe"] })
    let stderr = ""

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        resolve(new Error(`yt-dlp failed: ${stderr.slice(-200)}`))
        return
      }

      const realFile = findSubtitleFile(outFile, format)
      if (realFile instanceof Error) {
        resolve(realFile)
        return
      }

      let raw: string
      try {
        raw = fs.readFileSync(realFile, "utf-8")
      } catch {
        resolve(new Error("Failed to read subtitle file"))
        return
      }

      const parsed = format === "json3" ? parseJson3(raw) : parseVtt(raw)
      resolve(parsed)
    })
  })
}

function findSubtitleFile(outFile: string, format: string): string | Error {
  const dir = path.dirname(outFile)
  const ext = format === "json3" ? ".json3" : `.${format}`

  try {
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      if (entry.endsWith(ext)) {
        return path.join(dir, entry)
      }
    }
  } catch {
    // dir doesn't exist
  }

  return new Error(`No ${format} subtitle file found`)
}
