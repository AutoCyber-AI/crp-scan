# Changelog

## [0.3.1] - 2026-07-05

### Fixed
- Corrected marketplace publisher ID from `autocyber-ai` to `AutoCyberAI`.

## [0.3.0] - 2026-07-04

### Added
- Cross-platform Python discovery (`python`, `python3`, `py`).
- Workspace scan now returns a single valid JSON array instead of concatenated outputs.
- Real Quick Fixes for CRP001/CRP002 (inline comments to mark remediation).
- Additional rule support surfaced from the CLI: hard-coded API keys, raw
  `fetch`/`axios`/`curl` LLM calls, and more language coverage.
- Marketplace metadata: `repository`, `homepage`, `bugs`, and `package` script.

### Changed
- `CRP: Open Remediation PR` now explains that remediation PRs are generated
  by the CRP-Scan GitHub Action.
- `.vscodeignore` excludes `node_modules` and source TypeScript files from the
  packaged extension.

## [0.2.0] - 2026-06-05

### Added
- Status bar item showing scan progress and finding counts
- Auto-scan on workspace open (`crpScan.autoScanOnOpen`)
- Multi-language support: Python, TypeScript, JavaScript, Java, Go, Rust
- Per-file diagnostic mapping with line/column accuracy
- Finding count summary in status bar after scan
- "Show Last Scan Output" command for debugging
- Better error handling when CRP CLI is not installed
- Quick-install prompt with copy-to-clipboard for missing CLI

### Changed
- Improved diagnostic messages with rule IDs
- `scanWorkspace` now returns JSON output for downstream use
- Progress notification now shows severity breakdown on completion

## [0.1.0] - 2026-06-04

### Added
- Initial release
- `CRP: Scan Workspace` command
- `CRP: Open Remediation PR` command
- Auto-scan on save
- Configurable severity threshold (`crpScan.failOn`)
- Configurable scan paths (`crpScan.paths`)
- Problem matcher for CI integration
