import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execFileAsync = promisify(execFile)

export class CRPScanProvider implements vscode.CodeActionProvider {
  constructor(private collection: vscode.DiagnosticCollection) {}

  async scanDocument(document: vscode.TextDocument) {
    await this.scanPath(document.uri.fsPath)
  }

  async scanWorkspace() {
    const folders = vscode.workspace.workspaceFolders
    if (!folders) {
      vscode.window.showWarningMessage('No workspace folder open')
      return
    }
    for (const folder of folders) {
      await this.scanPath(folder.uri.fsPath)
    }
  }

  private async scanPath(targetPath: string) {
    const config = vscode.workspace.getConfiguration('crpScan')
    const failOn = config.get<string>('failOn', 'HIGH')
    const minVersion = config.get<string>('minVersion', '')

    const args = ['scan', '--format', 'json', '--fail-on', failOn, '--paths', targetPath]
    if (minVersion) {
      args.push('--min-version', minVersion)
    }

    try {
      const { stdout } = await execFileAsync('python', ['-m', 'crp', ...args], {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        timeout: 120_000,
      })

      const findings = JSON.parse(stdout)
      this.updateDiagnostics(targetPath, findings)
    } catch (err: any) {
      if (err.stdout) {
        try {
          const findings = JSON.parse(err.stdout)
          this.updateDiagnostics(targetPath, findings)
          return
        } catch {
          // ignore
        }
      }
      vscode.window.showErrorMessage(`CRP Scan failed: ${err.message}`)
    }
  }

  private updateDiagnostics(targetPath: string, findings: any[]) {
    const uri = vscode.Uri.file(targetPath)
    const diagnostics: vscode.Diagnostic[] = []

    for (const finding of findings) {
      const range = new vscode.Range(0, 0, 0, 0)
      const severity = this.mapSeverity(finding.severity)
      const diagnostic = new vscode.Diagnostic(
        range,
        `${finding.rule_id}: ${finding.message}`,
        severity
      )
      diagnostic.code = finding.rule_id
      diagnostic.source = 'crp-scan'
      diagnostics.push(diagnostic)
    }

    this.collection.set(uri, diagnostics)
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
      if (diagnostic.source === 'crp-scan' && diagnostic.code === 'CRP001') {
        const fix = new vscode.CodeAction(
          'Wrap in CRP Client',
          vscode.CodeActionKind.QuickFix
        )
        fix.diagnostics = [diagnostic]
        fix.edit = new vscode.WorkspaceEdit()
        // Placeholder: actual edit would parse the AST and wrap the call
        actions.push(fix)
      }
    }
    return actions
  }
}
