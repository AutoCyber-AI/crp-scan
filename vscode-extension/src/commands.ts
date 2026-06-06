import * as vscode from 'vscode'

export async function scanWorkspace(collection: vscode.DiagnosticCollection) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Running CRP Scan...',
      cancellable: true,
    },
    async (_progress, _token) => {
      const { CRPScanProvider } = await import('./diagnostics')
      const provider = new CRPScanProvider(collection)
      await provider.scanWorkspace()
      vscode.window.showInformationMessage('CRP Scan complete — check Problems panel')
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
      cancellable: false,
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
