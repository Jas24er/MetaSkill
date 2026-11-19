# Phase 3 — Verified Dual GitHub Radar & Supply-Chain Audit

Activate this module on demand whenever external skills, MCP servers, or CLI tools affect the recommendation. Never hallucinate GitHub repositories, npm packages, or MCP servers from memory. Follow this lookup and security verification order strictly.

---

## 1. Lookup Hierarchy

1. **Check Local Curated Seed First (`radar/seed-registry.json`):**
   - Filter entries matching the project's `domains` and host `os.platform` from `.agents/probe-profile.json`.
   - **Never recommend entries with `status: "archived"` or `"deprecated"`**—always route to their `replacedBy` active successor instead.
2. **Live Discovery (Only When Seed Lacks Coverage):**
   - Query live sources (`gh search repos`, GitHub API, or verified web search).
   - **Zero Memory Guessing:** If you cannot verify a repository's live existence and README in the current session, do NOT cite it or mark it `[UNVERIFIED — requires manual verification]`.

---

## 2. Mandatory Supply-Chain & Security Audit Checklist

Before recommending or installing any newly discovered skill or MCP server:
1. **Maintenance & Activity:** Confirm repository exists, check last commit/release date, and prefer official vendor orgs or active community maintainers.
2. **License Compatibility:** Verify license (`MIT`, `Apache-2.0`, etc.) fits the user's project.
3. **Code & Permission Inspection (Anti-Poisoning):**
   - Read install instructions, `package.json` / `pyproject.toml`, and executable scripts (`postinstall`, shell wrappers, Python hooks).
   - Check what filesystem paths, network endpoints, and `.env` credentials the MCP or skill reads.
   - Reject obfuscated binaries, unexpected outbound telemetry, or instructions requesting sensitive secrets indiscriminately.
4. **Status Tagging in Output:** Clearly label every recommendation:
   - `[VERIFIED — Seed Registry]` (curated & checked in `seed-registry.json`)
   - `[VERIFIED — Live Session Check]` (checked live during this session with security notes)
   - `[UNVERIFIED]` (never provide direct install command; explain what the user must verify manually)

---

## 3. Red-Zone Installation Gate

Installing or enabling any external MCP server or third-party skill script is a **Red-Zone action**:
- Explain in plain words (`vibecoder`) or exact command/config (`dev`) what permissions the MCP/skill needs.
- **Pause and ask for explicit human approval** before modifying `.cursor/mcp.json`, Claude MCP config, or executing `npx ...` installers for third-party skills.
