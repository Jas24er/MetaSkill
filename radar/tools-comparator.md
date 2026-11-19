# Phase 4 — Hardware-Aware `$0 Local vs. Paid Cloud` Tools Comparator

Activate this module on demand whenever tool feasibility, execution cost, or hardware capacity influences the recommendation. Cross-reference every heavy pipeline stage against `.agents/probe-profile.json`.

---

## 1. Hardware Feasibility Rules (Read `.agents/probe-profile.json` First)

| Machine Profile | Local Execution Reality | Guidance to Give User |
| :--- | :--- | :--- |
| **`totalRamGb < 16` or no dedicated GPU (`vramMb < 6000`)** | Deterministic tools (`ffmpeg`, `sox`, `playwright`, `gitleaks`, `semgrep`, Postgres) run fast. Heavy local AI models (`whisper large-v3`, local LLMs, local video diffusion) will OOM or crawl on CPU. | Recommend deterministic local `$0` tools for cutting/encoding/scanning + lightweight `faster-whisper small` OR cheap pay-per-use cloud APIs for heavy AI inference. |
| **`totalRamGb >= 16` + NVIDIA GPU (`vramMb >= 8000`) or Apple Silicon (`>= 16GB` unified)** | Local transcription (`faster-whisper`), hardware-accelerated encoding (`h264_nvenc` / VideoToolbox), Docker Compose stacks, and medium local models run reliably at `$0`. | Recommend full `$0` local pipeline first; note cloud options only when massive parallel batch scale is needed. |
| **Missing required CLI in `binaries`** | Pipeline scripts will fail until installed. | Provide exact OS install command from `npx mtsk doctor` (e.g., `winget` on Windows, `brew` on macOS, `apt` on Linux). |

---

## 2. Standard Output Comparison Table

Present one clear table covering every stage of the project's pipeline:

| Pipeline Stage | Route A: `$0` Local / Open-Source | Machine & Setup Requirements | Route B: Paid / Cloud Accelerated | Approx. Cost & When Worth Paying |
| :--- | :--- | :--- | :--- | :--- |
| *e.g. Web Hosting & DB* | Local Docker Postgres + self-hosted Node / Supabase free tier | `docker` or free-tier account | Vercel Pro / Supabase Pro / Managed Postgres | ~\$20–25/mo when exceeding free bandwidth/DB limits or needing team branches |
| *e.g. Video Processing* | `ffmpeg` + `Remotion` local render | `ffmpeg`, `node >= 20`, CPU/GPU time | Remotion Lambda / Cloud Transcoding APIs | Cents per render when batch-rendering hundreds of videos concurrently |
| *e.g. Speech / Captions* | `faster-whisper` (`small`/`medium`) | Python via `uv`, RAM/VRAM check | Groq / Deepgram / OpenAI Whisper API | ~\$0.04–\$0.36 per audio hour when local machine lacks VRAM or needs real-time speed |
| *e.g. Security & QA* | `gitleaks` + `semgrep` OSS + `osv-scanner` + `Playwright` | Local CLI binaries (`$0`) | Semgrep AppSec / Snyk / Hosted CI | Free for solo/small open-source repos; paid for org-wide policy dashboards |

---

## 3. Persona Formatting

- **`vibecoder`:** Highlight total monthly cost upfront (`$0 setup possible` vs `~$X/month`), flag hardware bottlenecks plainly (*"Your laptop handles video trimming locally for free, though automatic AI subtitles will be much faster with a ~\$0.05 cloud API"*), and keep setup steps copy-pasteable.
- **`dev`:** Include exact throughput limits, VRAM thresholds, Docker resource footprints, and vendor lock-in notes.
