# Domain Translator — Code as Universal Interface

MetaSkill treats **code, CLIs, SDKs, and MCP servers as a universal control plane** for any creative or engineering discipline.

---

## 1. Translation Workflow

For any domain (whether listed in `playbooks/` or a `custom` domain like CAD, 3D/Blender, music synthesis, data pipelines, or scientific publishing):

1. **Decompose into Deterministic Pipeline Stages:**
   - **Ingest & Inspect:** Measure inputs programmatically before transforming them (`ffprobe`, schema introspection, DOM audit, file header inspection).
   - **Transform / Build:** Execute via reproducible scripts, typed SDKs, headless CLIs, or verified MCP servers—never manual one-off GUI clicks that cannot be re-run or verified.
   - **Technical Verify:** Run objective assertions (`exit code`, schema/type checks, `ffprobe` streams, LUFS limits, SAST/secret scans, unit/E2E tests).
   - **Perceptual Preview:** Render lightweight artifacts into `preview/` for multimodal agent verification and fast human sign-off.
   - **Package / Export:** Emit clean deliverables into `output/` (or deployment build artifacts).

2. **Prefer Deterministic `$0` Local Tools Before Generative APIs:**
   - Use `ffmpeg`, `sox`, `playwright`, `psql`/`drizzle`, `gitleaks`, `semgrep` for structure, timing, validation, cutting, encoding, and security checks.
   - Reserve generative or paid APIs for tasks deterministic code cannot perform (e.g., speech-to-text, semantic synthesis, asset generation), always wrapped with caching and retry bounds.

---

## 2. Universal Workspace Boundary Contract

Every project configured by MetaSkill adopts clear directory roles so agents never corrupt source material or commit gigabytes of transient renders:

| Directory | Role | Mutability Rule | Git Tracked? |
| :--- | :--- | :--- | :--- |
| `inputs/` | User's raw media, datasets, assets, documents | **STRICTLY READ-ONLY.** Agents may read/inspect but NEVER overwrite or delete originals. | User choice (often ignored if large binary) |
| `src/` | Source code, pipeline scripts, schemas, migrations | Read/write inside Green Zone | Yes |
| `tests/` | Unit, integration, and verification scripts | Read/write inside Green Zone | Yes |
| `build/` | Intermediate renders, temp encodes, compiled bundles | Regenerable scratch outputs | No (`.gitignore`) |
| `preview/` | Lightweight QA artifacts (screenshots, contact sheets, security reports) | Regenerated per QA Gate | No (`.gitignore`) |
| `output/` | Final approved deliverables | Written only after passing Hybrid QA Gate | No (`.gitignore`) |
| `.agents/` | Canonical MetaSkill brain, generated specialist skills, probe profile, config | Managed via MetaSkill & `sync` | Yes (except secrets) |

---

## 3. Handling Unlisted (`custom`) Domains

When the project falls outside the 3 bundled pilot playbooks (e.g., Blender 3D `bpy`, OpenSCAD/CAD, Godot CLI, Typst/LaTeX, Manim):
1. Identify the dominant **headless CLI / Python or Node SDK / verified MCP** for that discipline.
2. Define at least **3 non-negotiable domain invariants** (e.g., manifold geometry & normals for 3D; deterministic seed & DPI/page overflow checks for typesetting; deterministic headless test scene for game dev).
3. Define a concrete **Technical + Perceptual QA Gate** producing a lightweight visual/data check in `preview/`.
4. Record the synthesized pipeline architecture in `SPEC.md` before synthesizing the specialist skill.
