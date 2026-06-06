# CRP Scan — VS Code Extension

AI Governance Scanner for VS Code. Detects ungoverned LLM calls, missing
safety policies, and regulatory gaps directly in your editor.

## Features

- **Inline diagnostics** — findings shown as you code
- **Auto-scan on save** — optional background scanning
- **Quick Fixes** — wrap calls in `crp.Client()` with one click
- **Command palette** — `CRP: Scan Workspace`, `CRP: Open Remediation PR`

## Requirements

- Python 3.10+
- `crprotocol>=4.0.0` installed (`pip install crprotocol[cli]`)

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `crpScan.failOn` | `HIGH` | Minimum severity for diagnostics |
| `crpScan.paths` | `.` | Paths to scan |
| `crpScan.autoScanOnSave` | `false` | Scan on every save |
| `crpScan.minVersion` | `""` | Minimum crprotocol version |

## Usage

1. Open a workspace with Python or TypeScript files
2. Run `CRP: Scan Workspace` from the command palette
3. View findings in the Problems panel
4. Hover over a finding and click "Quick Fix" to apply remediation

## License

Elastic License 2.0 — see LICENSE in the parent repository.
