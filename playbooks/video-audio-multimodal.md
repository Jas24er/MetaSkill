# Playbook: Video & Audio Multimodal Pipelines

Curated engineering reference for automated video editing, audio mastering, transcription, captions, and programmatic motion graphics.

---

## 1. Deterministic `$0` Engines & Hardware Rules

- **Primary Backbone (`$0` Local):** `ffmpeg` + `ffprobe` (mandatory), `sox` (optional audio DSP).
- **Programmatic Motion Graphics:** **Remotion** (`npx remotion skills add`) when generating React/TypeScript video templates, captions, and data animations.
- **Python Media / Local AI (`uv`):** Use `uv` isolated virtual environments (`.venv`) for `faster-whisper`, audio separation, or `Manim`—never global `pip install`.
- **Hardware Feasibility Guard (`.agents/probe-profile.json`):**
  - `totalRamGb < 16` or no NVIDIA GPU with `>= 6000` MB VRAM -> **BLOCK heavy local models** (`whisper large-v3`, local diffusion video). Default to `faster-whisper small` / `base`, deterministic FFmpeg pipelines, or low-cost cloud APIs (warn user explicitly in Phase 4).

---

## 2. Senior Media Invariants

1. **Strict Input Immutability:** Source media in `inputs/` is **read-only**. Scripts MUST write intermediates to `build/` and deliverables to `output/`. Never run in-place overwrites on source clips.
2. **Inspect Streams Before Processing:** Always run `ffprobe -v quiet -print_format json -show_format -show_streams <input>` before designing filter graphs to verify width, height, SAR/DAR, FPS (VFR vs CFR), audio sample rate, and channel count.
3. **Web-Safe Delivery Encoding:** Standard H.264 MP4 deliverables MUST specify `-c:v libx264 -pix_fmt yuv420p -r <fps> -c:a aac -b:a 192k -ar 48000 -movflags +faststart` (preventing QuickTime/Safari/mobile black-screen playback bugs).
4. **Broadcast / Social Loudness Standards:** Normalize final audio via two-pass `loudnorm` or verified filter target:
   - Web / YouTube / Desktop: `-14 LUFS` integrated, `<= -1.0 dBTP` true peak, `LRA <= 11 LU`.
   - Mobile / Reels / Shorts / Podcasts: `-16 LUFS` integrated, `<= -1.0 dBTP` true peak.
5. **Subtitle & Safe-Area Discipline:** For vertical `9:16` (`1080x1920`) exports, keep captions/overlays inside safe margins (at least `120px` top, `220px` bottom, `80px` sides) so social UI chrome never covers text.

---

## 3. Anti-Patterns Prevented

- **Vibecoder trap #1:** Re-encoding with wrong pixel format (`yuv444p` or 10-bit) that plays in VLC locally but fails black on browsers, WhatsApp, and iOS.
- **Vibecoder trap #2:** Using raw `-c:v copy` around non-keyframe cuts causing frozen initial frames or A/V desync.
- **Vibecoder trap #3:** Assuming a script succeeded on `exit code 0` while subtitles fall off-screen, audio clips at `+2 dB`, or video freezes at frame 1.

---

## 4. Mandatory Hybrid QA Gate

### Technical Gate
1. `ffprobe` assertion script confirms non-zero duration within tolerance, expected resolution, valid `yuv420p` video stream, and `48000 Hz` stereo/mono audio stream.
2. Audio measurement (`ffmpeg -i <output> -af ebur128 -f null -`) confirms integrated loudness within `±1.5 LU` of target and true peak `<= -1.0 dBTP`.

### Perceptual Gate (`preview/`)
1. Generate a `3x2` frame contact sheet across the output duration (`preview/contact-sheet.png`) using explicit evenly spaced timestamps or `fps` filter scaled to `640px` wide.
2. For audio-focused tasks, generate `preview/audio-spectrum.png` via `showspectrumpic=s=1280x480`.
3. Inspect `preview/contact-sheet.png` (and verify a sampled playback check) for black frames, subtitle truncation, stretched aspect ratios, and visual glitches before marking requirements `verified` (otherwise `pending` or `blocked`).

---

## 5. Walking Skeleton (< 5 Minutes)

1. Inspect a short clip in `inputs/` read-only with `ffprobe` (or generate a deterministic `3s` `testsrc2` + `sine` fixture if `inputs/` is empty, preserving originals untouched).
2. Run the minimal transform script producing `build/skeleton.mp4`.
3. Validate via `ffprobe` + `ebur128` + emit `preview/contact-sheet.png` and inspect it visually.
