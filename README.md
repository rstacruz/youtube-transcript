# youtube-transcript

Extract subtitles from YouTube videos via `yt-dlp`.

## Installation

Requires [yt-dlp](https://github.com/yt-dlp/yt-dlp) and Node.js, install those first.

```sh 
mise use -g node yt-dlp # via https://mise.jdx.dev
brew install nodejs yt-dlp # Homebrew on macOS

# ...more at https://github.com/yt-dlp/yt-dlp#installation
```

- Install as a skill:

  ```sh
  npx skills add rstacruz/youtube-transcript
  ```

- Use as a CLI tool:

  ```
  npx github:rstacruz/youtube-transcript <url>
  ```

## Usage (skill)

Use your favourite agentic harness and say:

> summarise https://youtu.be/dQw4w9WgXcQ

## Usage (CLI)

```
npx github:rstacruz/youtube-transcript <url> [options]
```

**Options:**

| Flag | Long | Description | Default |
|------|------|-------------|---------|
| `-l` | `--lang` | Subtitle language | `en` |
| `-f` | `--format` | Output format: `text` or `json` | `text` |

Example:

```bash
$ youtube-transcript https://youtu.be/dQw4w9WgXcQ
[00:00] We're no strangers to love
[00:17] You know the rules and so do I
[00:24] A full commitment's what I'm thinking of
...
```

```bash
$ youtube-transcript -f json https://youtu.be/dQw4w9WgXcQ
[
  { "start": 0.0, "end": 17.1, "text": "We're no strangers to love" },
  { "start": 17.1, "end": 24.2, "text": "You know the rules and so do I" }
]
```
