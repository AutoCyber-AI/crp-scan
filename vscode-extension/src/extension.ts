import * as vscode from 'vscode'
import { CRPScanProvider } from './diagnostics'
import { scanWorkspace, openRemediationPR } from './commands'

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('crp-scan')
  const provider = new CRPScanProvider(diagnosticCollection)

  context.subscriptions.push(diagnosticCollection)

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('crpScan.scanWorkspace', () =>
      scanWorkspace(diagnosticCollection)
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('crpScan.openRemediationPR', () =>
      openRemediationPR()
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('crpScan.showSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'crpScan')
    })
  )

  // Auto-scan on save (if enabled)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const config = vscode.workspace.getConfiguration('crpScan')
      if (config.get<boolean>('autoScanOnSave', false)) {
        provider.scanDocument(doc)
      }
    })
  )

  // Register code actions (quick fixes)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ scheme: 'file', language: 'python' }, { scheme: 'file', language: 'typescript' }],
      provider
    )
  )
}

export function deactivate() {}
