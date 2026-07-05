import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

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
    const findings = await this._scanPathRaw(document.uri.fsPath, statusBar)
    this.updateDiagnostics(findings)
    this.updateCounts(findings)
    return JSON.stringify(findings)
  }

  async scanWorkspace(statusBar?: vscode.StatusBarItem): Promise<string> {
    const folders = vscode.workspace.workspaceFolders
    if (!folders) {
      vscode.window.showWarningMessage('No workspace folder open')
      return '[]'
    }

    const allFindings: ScanFinding[] = []
    for (const folder of folders) {
      const findings = await this._scanPathRaw(folder.uri.fsPath, statusBar)
      allFindings.push(...findings)
    }
    this.updateDiagnostics(allFindings)
    this.updateCounts(allFindings)
    return JSON.stringify(allFindings)
  }

  async scanPath(targetPath: string, statusBar?: vscode.StatusBarItem): Promise<string> {
    const findings = await this._scanPathRaw(targetPath, statusBar)
    this.updateDiagnostics(findings)
    this.updateCounts(findings)
    return JSON.stringify(findings)
  }

  private async _resolvePython(): Promise<string> {
    const candidates = process.platform === 'win32'
      ? ['python', 'py', 'python3']
      : ['python3', 'python']

    for (const cmd of candidates) {
      try {
        await execFileAsync(cmd, ['--version'], { timeout: 5000 })
        return cmd
      } catch {
        // try next candidate
      }
    }
    return 'python'
  }

  private async _scanPathRaw(targetPath: string, statusBar?: vscode.StatusBarItem): Promise<ScanFinding[]> {
    const config = vscode.workspace.getConfiguration('crpScan')
    const failOn = config.get<string>('failOn', 'HIGH')
    const minVersion = config.get<string>('minVersion', '')
    const python = await this._resolvePython()

    const args = ['-m', 'crp', 'scan', '--format', 'json', '--fail-on', failOn, '--paths', targetPath]
    if (minVersion) {
      args.push('--min-version', minVersion)
    }

    try {
      const { stdout } = await execFileAsync(python, args, {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        timeout: 120_000
      })
      return JSON.parse(stdout) as ScanFinding[]
    } catch (err: any) {
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout) as ScanFinding[]
        } catch {
          // fall through to error handling
        }
      }

      const msg = err.message || String(err)
      const notFound = msg.includes('No module named') || msg.includes('command not found') || msg.includes('not recognized')
      if (notFound) {
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
        vscode.window.showErrorMessage(`CRP Scan failed: ${msg}`)
      }
      return []
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
    const byFile = new Map<string, vscode.Diagnostic[]>()

    for (const finding of findings) {
      const filePath = finding.file || '.'
      const uri = vscode.Uri.file(
        path.isAbsolute(filePath)
          ? filePath
          : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', filePath)
      )

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
          )
        ]
      }

      if (!byFile.has(uri.fsPath)) {
        byFile.set(uri.fsPath, [])
      }
      byFile.get(uri.fsPath)!.push(diagnostic)
    }

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

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'crp-scan') continue

      const lineRange = document.lineAt(diagnostic.range.start.line).range
      const lineText = document.lineAt(diagnostic.range.start.line).text
      const appendComment = (text: string) => {
        if (lineText.includes(text)) return undefined
        const edit = new vscode.WorkspaceEdit()
        edit.replace(document.uri, lineRange, `${lineText}  ${text}`)
        return edit
      }

      if (diagnostic.code === 'CRP001') {
        const edit = appendComment('// CRP: wrap in crp.Client()')
        if (edit) {
          const fix = new vscode.CodeAction(
            'CRP: mark for crp.Client() wrap',
            vscode.CodeActionKind.QuickFix
          )
          fix.diagnostics = [diagnostic]
          fix.edit = edit
          actions.push(fix)
        }
      }

      if (diagnostic.code === 'CRP002') {
        const edit = appendComment('// CRP: add CRP-Safety-Policy header')
        if (edit) {
          const fix = new vscode.CodeAction(
            'CRP: mark for safety header',
            vscode.CodeActionKind.QuickFix
          )
          fix.diagnostics = [diagnostic]
          fix.edit = edit
          actions.push(fix)
        }
      }

      if (diagnostic.code === 'CRP003' || diagnostic.code === 'CRP004' || diagnostic.code === 'CRP006') {
        const action = new vscode.CodeAction(
          'CRP: open documentation',
          vscode.CodeActionKind.QuickFix
        )
        action.diagnostics = [diagnostic]
        action.command = {
          command: 'vscode.open',
          title: 'Open CRP docs',
          arguments: [vscode.Uri.parse('https://crprotocol.io/getting-started/installation/')]
        }
        actions.push(action)
      }
    }
    return actions
  }
}
