import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execFileAsync = promisify(execFile)

interface ScanFinding {
  rule_id: string
  message: string
  severity: string
  file?: string
  line?: number
  column?: number
  suggestion?: string
}

export class CRPScanProvider implements vscode.CodeActionProvider {
  lastCounts: Record<string, number> = {}

  constructor(private collection: vscode.DiagnosticCollection) {}

  async scanDocument(document: vscode.TextDocument, statusBar?: vscode.StatusBarItem): Promise<string> {
    return this.scanPath(document.uri.fsPath, statusBar)
  }

  async scanWorkspace(statusBar?: vscode.StatusBarItem): Promise<string> {
    const folders = vscode.workspace.workspaceFolders
    if (!folders) {
      vscode.window.showWarningMessage('No workspace folder open')
      return ''
    }
    let combined = ''
    for (const folder of folders) {
      const out = await this.scanPath(folder.uri.fsPath, statusBar)
      combined += out
    }
    return combined
  }

  private async scanPath(targetPath: string, statusBar?: vscode.StatusBarItem): Promise<string> {
    const config = vscode.workspace.getConfiguration('crpScan')
    const failOn = config.get<string>('failOn', 'HIGH')
    const minVersion = config.get<string>('minVersion', '')

    const args = ['-m', 'crp', 'scan', '--format', 'json', '--fail-on', failOn, '--paths', targetPath]
    if (minVersion) {
      args.push('--min-version', minVersion)
    }

    try {
      const { stdout } = await execFileAsync('python', args, {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        timeout: 120_000,
      })

      const findings: ScanFinding[] = JSON.parse(stdout)
      this.updateDiagnostics(findings)
      this.updateCounts(findings)
      return stdout
    } catch (err: any) {
      // Try to parse partial output even on non-zero exit
      if (err.stdout) {
        try {
          const findings: ScanFinding[] = JSON.parse(err.stdout)
          this.updateDiagnostics(findings)
          this.updateCounts(findings)
          return err.stdout
        } catch {
          // not valid JSON
        }
      }

      // Check if crp is installed
      if (err.message?.includes('No module named') || err.message?.includes('command not found')) {
        const install = await vscode.window.showErrorMessage(
          'CRP CLI not found. Install with: pip install crprotocol[cli]',
          'Copy Command',
          'Open Docs'
        )
        if (install === 'Copy Command') {
          await vscode.env.clipboard.writeText('pip install crprotocol[cli]')
        } else if (install === 'Open Docs') {
          vscode.env.openExternal(vscode.Uri.parse('https://crprotocol.io/getting-started/installation/'))
        }
      } else {
        vscode.window.showErrorMessage(`CRP Scan failed: ${err.message}`)
      }
      return ''
    }
  }

  private updateCounts(findings: ScanFinding[]) {
    this.lastCounts = {}
    for (const f of findings) {
      const sev = f.severity?.toUpperCase() || 'UNKNOWN'
      this.lastCounts[sev] = (this.lastCounts[sev] || 0) + 1
    }
  }

  private updateDiagnostics(findings: ScanFinding[]) {
    // Group by file
    const byFile = new Map<string, vscode.Diagnostic[]>()

    for (const finding of findings) {
      const filePath = finding.file || '.'
      const uri = vscode.Uri.file(path.isAbsolute(filePath) ? filePath : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', filePath))

      const line = Math.max(0, (finding.line || 1) - 1)
      const col = Math.max(0, (finding.column || 1) - 1)
      const range = new vscode.Range(line, col, line, col + 1)
      const severity = this.mapSeverity(finding.severity)
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${finding.rule_id}] ${finding.message}`,
        severity
      )
      diagnostic.code = finding.rule_id
      diagnostic.source = 'crp-scan'
      if (finding.suggestion) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(uri, range),
            `Suggestion: ${finding.suggestion}`
          ),
        ]
      }

      if (!byFile.has(uri.fsPath)) {
        byFile.set(uri.fsPath, [])
      }
      byFile.get(uri.fsPath)!.push(diagnostic)
    }

    // Clear old diagnostics for scanned files and set new ones
    this.collection.clear()
    for (const [filePath, diagnostics] of byFile) {
      this.collection.set(vscode.Uri.file(filePath), diagnostics)
    }
  }

  private mapSeverity(level: string): vscode.DiagnosticSeverity {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return vscode.DiagnosticSeverity.Error
      case 'medium':
        return vscode.DiagnosticSeverity.Warning
      case 'low':
        return vscode.DiagnosticSeverity.Information
      default:
        return vscode.DiagnosticSeverity.Hint
    }
  }

  // Quick Fix: wrap LLM call in crp.Client()
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'crp-scan') continue

      if (diagnostic.code === 'CRP001') {
        const fix = new vscode.CodeAction(
          'Wrap in CRP Client',
          vscode.CodeActionKind.QuickFix
        )
        fix.diagnostics = [diagnostic]
        fix.edit = new vscode.WorkspaceEdit()
        // TODO: Implement AST-based wrapping
        actions.push(fix)
      }

      if (diagnostic.code === 'CRP002') {
        const fix = new vscode.CodeAction(
          'Add CRP Safety Policy header',
          vscode.CodeActionKind.QuickFix
        )
        fix.diagnostics = [diagnostic]
        fix.edit = new vscode.WorkspaceEdit()
        actions.push(fix)
      }
    }
    return actions
  }
}
