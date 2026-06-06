# Changelog

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
