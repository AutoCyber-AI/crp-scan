import * as vscode from 'vscode'

let lastScanOutput = ''

export async function scanWorkspace(
  collection: vscode.DiagnosticCollection,
  statusBar?: vscode.StatusBarItem
) {
  if (statusBar) {
    statusBar.text = '$(sync~spin) CRP Scanning...'
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Running CRP Scan...',
      cancellable: true
    },
    async (_progress: vscode.Progress<{ message?: string; increment?: number }>, _token: vscode.CancellationToken) => {
      const { CRPScanProvider } = await import('./diagnostics')
      const provider = new CRPScanProvider(collection)
      const output = await provider.scanWorkspace()
      lastScanOutput = output

      const config = vscode.workspace.getConfiguration('crpScan')
      const counts = provider.lastCounts
      const total = (counts.CRITICAL || 0) + (counts.HIGH || 0) + (counts.MEDIUM || 0) + (counts.LOW || 0)

      if (total === 0) {
        vscode.window.showInformationMessage('✅ CRP Scan complete — no issues found')
      } else {
        const msg = `CRP Scan complete — ${total} finding(s): ${counts.CRITICAL || 0} critical, ${counts.HIGH || 0} high, ${counts.MEDIUM || 0} medium, ${counts.LOW || 0} low`
        vscode.window.showWarningMessage(msg)
      }

      if (statusBar) {
        statusBar.text = total > 0 ? `$(shield) CRP (${total})` : '$(shield) CRP'
      }
    }
  )
}

export async function openRemediationPR() {
  const config = vscode.workspace.getConfiguration('crpScan')
  const paths = config.get<string>('paths', '.')

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating remediation PR...',
      cancellable: false
    },
    async () => {
      try {
        const { execFile } = await import('child_process')
        const { promisify } = await import('util')
        const execFileAsync = promisify(execFile)

        await execFileAsync(
          'python',
          ['-m', 'crp', 'scan', 'remediate', '--paths', paths],
          { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }
        )

        vscode.window.showInformationMessage('Remediation PR opened')
      } catch (err: any) {
        vscode.window.showErrorMessage(`Remediation failed: ${err.message}`)
      }
    }
  )
}

export function showScanOutput() {
  if (!lastScanOutput) {
    vscode.window.showInformationMessage('No scan output available. Run CRP: Scan Workspace first.')
    return
  }
  vscode.workspace.openTextDocument({
    content: lastScanOutput,
    language: 'json'
  }).then((d) => vscode.window.showTextDocument(d))
}
