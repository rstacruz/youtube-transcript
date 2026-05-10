---
name: youtube-transcript
description: Extracts transcripts from YouTube videos using a bundled Node.js script backed by yt-dlp. Returns cleaned transcript output with timestamps in text or JSON. Use when the user says `$yt-transcript <url>` or asks for a YouTube transcript or cleaned captions.
---

# YouTube Transcripts

Use this skill when the user asks for a YouTube transcript.

## Workflow

1. Validate the URL before extraction.
2. Run the bundled transcript script:

```bash
<skill-dir>/scripts/youtube-transcript.js <url> [--lang <lang>] [--format json]
```

The script handles downloading, parsing, and cleaning in one step — no separate download/parse phases needed.

## Output Format

**text** (default) — one timestamped segment per line:

```
[00:01] All right, so here we are, in front of the elephants
[00:05] the cool thing about these guys is that they have really long trunks
```

**json** — array of segments with `start`, `end`, and `text`:

```json
[
  {"start": 1.2, "end": 3.36, "text": "All right, so here we are..."},
  {"start": 5.32, "end": 7.97, "text": "the cool thing about..."}
]
```

## Notes

- The script is a self-contained Node.js bundle (no `node_modules` needed at runtime).
- Prefer this bundled script over ad hoc one-off parsing.
- Return transcript output only.
