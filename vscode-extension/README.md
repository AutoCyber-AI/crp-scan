# CRP Scan — VS Code Extension

AI Governance Scanner for VS Code. Detects ungoverned LLM calls, missing
safety policies, hard-coded API keys, and regulatory gaps directly in your
editor.

## Features

- **Inline diagnostics** — findings shown as you code
- **Auto-scan on save / open** — optional background scanning
- **Quick Fixes** — mark calls for `crp.Client()` wrapping or safety headers
- **Command palette** — `CRP: Scan Workspace`, `CRP: Show Last Scan Output`
- **Multi-language** — Python, TypeScript, JavaScript, Java, Go, Rust, C#,
  Ruby, PHP, Swift, Kotlin

## Requirements

- Python 3.10+
- `crprotocol>=4.0.0` installed (`pip install crprotocol[cli]`)

The extension will try `python`, `python3`, and `py` (Windows) to locate the
CRP CLI. If the CLI is not installed, you will be prompted to copy the install
command.

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `crpScan.failOn` | `HIGH` | Minimum severity for diagnostics |
| `crpScan.paths` | `.` | Paths to scan |
| `crpScan.autoScanOnSave` | `false` | Scan on every save |
| `crpScan.autoScanOnOpen` | `false` | Scan when a folder is opened |
| `crpScan.minVersion` | `""` | Minimum crprotocol version |

## Usage

1. Open a workspace with Python or TypeScript files.
2. Run `CRP: Scan Workspace` from the command palette.
3. View findings in the Problems panel.
4. Hover over a finding and click **Quick Fix** to mark it for remediation.

## Packaging and publishing

```bash
cd vscode-extension
npm ci
npm run compile
npx @vscode/vsce package
```

To publish automatically on tags:

```bash
git tag vscode-v0.3.0
git push origin vscode-v0.3.0
```

Requires a `VSCE_PAT` repository secret with a Visual Studio Marketplace
publisher personal access token.

## License

Elastic License 2.0 — see LICENSE in the parent repository.
