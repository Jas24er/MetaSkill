# Recipe: Audio, Video & Image

## 1. What is checked
- Original files in `inputs/` remain byte-for-byte unchanged (SHA-256 verified before and after).
- Media streams meet target technical format (`ffprobe`: codec, `yuv420p` pixel format, constant frame rate, `48000 Hz` audio, duration > `0`).
- Audio loudness meets target range (`ebur128` integrated LUFS around `-14` / `-16`, true peak `<= -1.0 dBTP`).
- Visual frames look clean without clipped/corrupt artifacts.

## 2. Tools
- `ffprobe` (stream & container inspection), `ffmpeg` (`ebur128` loudness + contact sheet), `sha256` hash verification, `sox` (optional audio DSP).

## 3. Evidence produced
- Visual inspection grid `preview/contact-sheet.png` (for example `3x2` tile) and optional `preview/audio-spectrum.png` / media JSON summary.
- Command results and `inputs/` immutability assertion in `.agents/evidence/report.{md,json}`.

## 4. Typical mistakes the reviewer hunts for
- Editing or overwriting source files directly inside `inputs/` instead of writing intermediates to `build/` and outputs to `output/`.
- Claiming export quality from exit code `0` without inspecting `ffprobe` stream specs or viewing `preview/contact-sheet.png`.
- Missing audio stream, clipped peak (`> -1.0 dBTP`), or variable frame rate breaking downstream editors.
- Broken relative output paths or zero-byte artifacts.
