# Playbook: App Web Full Stack

Curated architectural and QA reference for TypeScript full-stack web applications (Next.js, React + Vite, Astro, Node/Edge backends).

---

## 1. Default Stack & Toolchain

- **Core:** TypeScript (`strict: true`), Next.js (App Router) or Vite + React + Tailwind CSS.
- **Browser QA & Automation:** Playwright CLI or official `@playwright/mcp@latest` (`microsoft/playwright-mcp`).
- **Database / Auth Integration:** Pair with `playbooks/db-appsec-defensive.md` whenever user accounts, persistence, or payments exist.
- **Prerequisite Check (`.agents/probe-profile.json`):** `node >= 20`, `npm` or `pnpm`, `git`.

---

## 2. Senior Engineering Invariants

1. **Strict Client/Server Secret Boundary:** Never expose server credentials in client bundles (`NEXT_PUBLIC_` or `VITE_` prefixes are strictly for public values). Validate all environment variables at startup with Zod.
2. **Responsive First (`375px` & `1280px`):** Every core route and interactive control must render cleanly on mobile (`375x812`) and desktop (`1280x800`) with zero horizontal overflow.
3. **Resilient UI States:** Every async fetch, form submission, and empty view must handle loading, empty, and error states cleanly (never silent white screens or raw stack traces).
4. **Server-Side Input Validation:** Validate every API route / server action payload with Zod (never trust client validation alone).
5. **Accessible Semantics:** Real `<button>`, `<a href>`, `<label>` elements, keyboard navigation, and legible contrast.
6. **Zero Console/Hydration Errors:** Fix React hydration mismatches, 404 asset requests, and uncaught runtime exceptions immediately.

---

## 3. Anti-Patterns Prevented

- **Vibecoder trap #1:** Calling external paid APIs or DB queries directly from browser client components and leaking keys in DevTools.
- **Vibecoder trap #2:** Assuming the UI works because `npm run build` passed, while buttons fail silently at runtime or mobile layout clips half the screen.
- **Vibecoder trap #3:** Bloating state management or CSS dependencies before validating the core user journey.

---

## 4. Mandatory Hybrid QA Gate

### Technical Gate
1. `npm run typecheck` (or `tsc --noEmit`) exits `0`.
2. `npm run build` exits `0`.
3. Automated unit/integration tests pass (`npm test`).
4. Headless Playwright check against `http://localhost:<port>`:
   - `0` uncaught `pageerror` events
   - `0` console `error` messages
   - `0` unexpected `5xx` API responses during smoke interactions.

### Perceptual Gate (`preview/`)
- Capture `preview/web-desktop.png` (`1280x800`) and `preview/web-mobile.png` (`375x812`), or record HTTP/DOM interaction results in `preview/web-verification.md` when headless browsers are unavailable.
- Visually inspect both screenshots for typography overlap, clipped controls, broken images, contrast issues, and horizontal scrollbars before marking any requirement `verified` (otherwise leave `pending` or `blocked`).

---

## 5. Walking Skeleton (< 5 Minutes)

1. Inspect existing project files read-only first (`brownfield`) or agree on first usable UI outcome (`greenfield`).
2. Scaffold minimal app shell + single health/status endpoint + primary interactive route.
3. Start local dev/preview server, run real Playwright/HTTP interaction check, save `preview/` evidence, confirm zero errors, and commit clean baseline (if authorized).
