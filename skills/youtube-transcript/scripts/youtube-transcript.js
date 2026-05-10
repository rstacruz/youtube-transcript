#!/usr/bin/env -S node --experimental-strip-types

// src/index.ts
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

// src/parse-json3.ts
function parseJson3(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return new Error("Failed to parse JSON3 subtitle data");
  }
  if (!data.events || !Array.isArray(data.events)) {
    return new Error("Invalid JSON3 format: missing events array");
  }
  const segments = [];
  for (const event of data.events) {
    if (event.aAppend)
      continue;
    if (!event.segs || event.segs.length === 0)
      continue;
    const text = event.segs.map((s) => s.utf8).join("").trim();
    if (!text)
      continue;
    const start = event.tStartMs / 1000;
    const end = event.dDurationMs != null ? (event.tStartMs + event.dDurationMs) / 1000 : start + 1;
    segments.push({ start, end, text });
  }
  if (segments.length === 0) {
    return new Error("No transcript segments found in JSON3 data");
  }
  return segments;
}

// src/parse-vtt.ts
var CUE_RE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
function parseTimestamp(h, m, s, ms) {
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
}
function stripVttText(text) {
  return text.replace(/<c>/g, "").replace(/<\/c>/g, "").replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "").replace(/align:start position:\d+%/g, "").trim();
}
function parseVtt(raw) {
  const lines = raw.split(`
`);
  const segments = [];
  let currentStart = -1;
  let currentEnd = -1;
  let textBuffer = [];
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "WEBVTT" || line.startsWith("Kind:") || line.startsWith("Language:")) {
      continue;
    }
    if (line === "") {
      if (currentStart >= 0 && textBuffer.length > 0) {
        const text = stripVttText(textBuffer.join(" ").trim());
        if (text) {
          segments.push({ start: currentStart, end: currentEnd, text });
        }
        currentStart = -1;
        currentEnd = -1;
        textBuffer = [];
      }
      continue;
    }
    const match = CUE_RE.exec(line);
    if (match) {
      currentStart = parseTimestamp(match[1], match[2], match[3], match[4]);
      currentEnd = parseTimestamp(match[5], match[6], match[7], match[8]);
      continue;
    }
    if (currentStart >= 0) {
      textBuffer.push(line);
    }
  }
  if (currentStart >= 0 && textBuffer.length > 0) {
    const text = stripVttText(textBuffer.join(" ").trim());
    if (text) {
      segments.push({ start: currentStart, end: currentEnd, text });
    }
  }
  if (segments.length === 0) {
    return new Error("No transcript segments found in VTT data");
  }
  return segments;
}

// src/index.ts
var { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    lang: { type: "string", short: "l", default: "en" },
    format: { type: "string", short: "f", default: "text" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" }
  },
  allowPositionals: true
});
if (values.help) {
  showHelp();
  process.exit(0);
}
if (values.version) {
  process.stdout.write(`youtube-transcript 1.0.0
`);
  process.exit(0);
}
var url = positionals[0];
if (!url) {
  process.stderr.write(`error: YouTube URL is required
`);
  showHelp();
  process.exit(1);
}
if (values.format !== "text" && values.format !== "json") {
  process.stderr.write(`error: --format must be "text" or "json"
`);
  process.exit(1);
}
var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-transcript-"));
var outFile = path.join(tempDir, "subs");
try {
  const result = await downloadAndParse(url, values.lang, outFile);
  if (result instanceof Error) {
    process.stderr.write(`error: ${result.message}
`);
    process.exit(1);
  }
  if (values.format === "json") {
    process.stdout.write(JSON.stringify(result, null, 2) + `
`);
  } else {
    for (const seg of result) {
      const ts = formatTimestamp(seg.start);
      process.stdout.write(`[${ts}] ${seg.text}
`);
    }
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
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
`);
}
function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
async function downloadAndParse(url2, lang, outFile2) {
  for (const fmt of ["json3", "vtt"]) {
    const result = await tryDownload(url2, lang, fmt, outFile2);
    if (!(result instanceof Error))
      return result;
  }
  return new Error("No transcript available for this video");
}
function tryDownload(url2, lang, format, outFile2) {
  return new Promise((resolve) => {
    const args = [
      "--write-auto-sub",
      "--sub-lang",
      lang,
      "--sub-format",
      format,
      "--skip-download",
      "-o",
      outFile2,
      url2
    ];
    const proc = spawn("yt-dlp", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(new Error(`yt-dlp failed: ${stderr.slice(-200)}`));
        return;
      }
      const realFile = findSubtitleFile(outFile2, format);
      if (realFile instanceof Error) {
        resolve(realFile);
        return;
      }
      let raw;
      try {
        raw = fs.readFileSync(realFile, "utf-8");
      } catch {
        resolve(new Error("Failed to read subtitle file"));
        return;
      }
      const parsed = format === "json3" ? parseJson3(raw) : parseVtt(raw);
      resolve(parsed);
    });
  });
}
function findSubtitleFile(outFile2, format) {
  const dir = path.dirname(outFile2);
  const ext = format === "json3" ? ".json3" : `.${format}`;
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith(ext)) {
        return path.join(dir, entry);
      }
    }
  } catch {}
  return new Error(`No ${format} subtitle file found`);
}
