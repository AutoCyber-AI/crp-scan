<div align="center">

# CRP-Scan

**AI Governance Scanner for LLM-Integrated Codebases**

[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-CRP--Scan%20v1-blue?logo=github)](https://github.com/marketplace/actions/crp-scan)
[![crprotocol](https://img.shields.io/pypi/v/crprotocol?label=crprotocol&logo=pypi)](https://pypi.org/project/crprotocol/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A GitHub Action and CLI that scans your repository for AI-governance
conformance — detecting **ungoverned LLM calls**, **missing safety
policies**, **absent audit trails**, and **version drift** in
CRP-enabled projects.

Findings are uploaded to the **GitHub Security tab** (SARIF) and
appended to the GitHub Actions step summary.

</div>

---

## Quick Start

Add this to your workflow (`.github/workflows/crp-scan.yml`):

```yaml
name: CRP-Scan

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 0 * * 1'   # weekly Monday scan

permissions:
  contents: read
  security-events: write   # required for SARIF upload

jobs:
  crp-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: AutoCyber-AI/crp-scan@v1
```

That's it. Push and the scan runs automatically.

---

## What it detects

| Rule | Severity | Description |
|------|----------|-------------|
| **CRP001** | HIGH | Ungoverned LLM calls — direct API calls with no CRP adapter in the call path |
| **CRP002** | MEDIUM | CRP used but no safety policy defined |
| **CRP003** | HIGH | No halt / policy-enforcement path |
| **CRP004** | MEDIUM | No provenance / audit trail |
| **CRP005** | LOW | Policy lint — report-only, weak grounding, untrusted source |
| **CRP006** | LOW | `crprotocol` version drift — running an outdated package |

---

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `paths` | `.` | Comma-separated paths to scan |
| `fail-on` | `HIGH` | Minimum severity that causes a build failure (`LOW\|MEDIUM\|HIGH\|CRITICAL`) |
| `format` | `text` | Console output format (`text\|json\|markdown\|sarif\|junit`) |
| `upload-sarif` | `true` | Upload SARIF to the GitHub Security tab |
| `summary` | `true` | Append markdown summary to step summary |
| `report-only` | `false` | Never fail the build (always exit 0) |
| `min-version` | `''` | Minimum required `crprotocol` version |
| `min-grounding` | `0.0` | Minimum grounding score for policy lint (0.0–1.0) |
| `python-version` | `3.11` | Python version to use |
| `crprotocol-version` | `''` | Pin a specific `crprotocol` version |

## Outputs

| Output | Description |
|--------|-------------|
| `sarif-file` | Path to the generated SARIF file |
| `findings-count` | Total number of findings |
| `highest-severity` | Highest severity (`NONE\|LOW\|MEDIUM\|HIGH\|CRITICAL`) |

---

## Full workflow example

```yaml
name: CRP Governance Scan

on: [push, pull_request]

permissions:
  contents: read
  security-events: write

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run CRP-Scan
        id: crp
        uses: AutoCyber-AI/crp-scan@v1
        with:
          paths: 'src,app,lib'
          fail-on: MEDIUM
          format: markdown
          upload-sarif: true
          summary: true
          min-version: '3.1.0'
          min-grounding: '0.6'

      - name: Comment findings on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const count = '${{ steps.crp.outputs.findings-count }}';
            const sev   = '${{ steps.crp.outputs.highest-severity }}';
            github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: `## CRP-Scan Results\n\n**Findings:** ${count}  \n**Highest severity:** ${sev}`
            });
```

---

## CLI usage

Install and run locally:

```bash
pip install "crprotocol[cli]>=3.1.0"

# Scan current directory
python -m crp scan

# Scan specific paths, fail on HIGH+
python -m crp scan --paths src,lib --fail-on HIGH

# Output SARIF for local inspection
python -m crp scan --format sarif --sarif results.sarif .

# Full options
python -m crp scan --help
```

---

## Testing the Action locally

Use [act](https://github.com/nektos/act) to run the Action locally:

```bash
# Install act
brew install act   # macOS

# Run the crp-scan workflow
act push -W .github/workflows/crp-scan.yml
```

---

## Security & Privacy

CRP-Scan runs **entirely locally** — no code is sent to external servers.
The scanner reads your source files, applies static analysis rules, and
reports findings.

SARIF upload uses the standard GitHub Code Scanning API (token-authenticated,
scoped to your repository).

---

## License

MIT — see [LICENSE](LICENSE).

The underlying `crprotocol` package is © AutoCyber-AI and distributed under
the [crprotocol license](https://github.com/AutoCyber-AI/context-relay-protocol/blob/main/LICENSE.md).

---

## Links

- [Context Relay Protocol specification](https://github.com/AutoCyber-AI/context-relay-protocol)
- [crprotocol on PyPI](https://pypi.org/project/crprotocol/)
- [Full Setup & Testing Guide](https://github.com/AutoCyber-AI/context-relay-protocol/blob/main/docs/CRP_SCAN_ACTION_GUIDE.md)
- [Report a bug / request a rule](https://github.com/AutoCyber-AI/crp-scan/issues)

done
