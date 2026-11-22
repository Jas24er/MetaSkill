# MetaSkill GitHub Action (`metaskill/verify`)

Run `mtsk verify` in Pull Requests and post a sticky Evidence Report comment automatically.

## Usage

```yaml
name: MetaSkill Verification
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - uses: Jas24er/MetaSkill@main
        with:
          contract: SPEC.md
          post-pr-comment: "true"
          fail-on-incomplete: "true"
```

## Inputs & Outputs
- **Inputs:** `contract` (`SPEC.md`), `working-directory` (`.`), `timeout-ms` (`60000`), `post-pr-comment` (`true`), `github-token` (`${{ github.token }}`), `fail-on-incomplete` (`true`), `lang` (`en`).
- **Outputs:** `status` (`verified` | `incomplete`), `report-md`, `report-json`.
