# Recipe: Web & Frontend

## 1. What is checked
- Typecheck, production build, and unit/component tests pass.
- Real user flow works end-to-end in a browser or live HTTP server (0 uncaught console errors, 0 unexpected `5xx` responses).
- Layout holds cleanly on desktop (`1280x800`) and mobile (`375x812`) viewports.
- Basic accessibility: semantic landmarks, visible labels, keyboard focus/tab order, readable contrast.

## 2. Tools
- Build & tests: `npm run typecheck`, `npm run build`, `npm test` (or team equivalents).
- E2E & visual checks: Playwright, Cypress, or Antigravity browser recordings + screenshots.

## 3. Evidence produced
- Test/e2e command log in `.agents/evidence/report.{md,json}` (`mtsk verify`).
- Desktop and mobile screenshots in `preview/` referenced with `file: preview/<name>.png` (or `preview/web-verification.md` when headless browser tooling is absent).

## 4. Typical mistakes the reviewer hunts for
- Claiming UI works from a `build` exit code `0` without rendering or interacting with the page.
- Returning raw JSON on `GET /` when HTML UI was requested, or returning `500` instead of `400` on invalid form submit.
- Hidden horizontal overflow on mobile (`375px`) or swallowed `console.error` / failed network calls.
- Placeholder links or forms wired to no-op handlers.
