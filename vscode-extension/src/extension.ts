import * as vscode from 'vscode'
import { CRPScanProvider } from './diagnostics'
import { scanWorkspace, openRemediationPR, showScanOutput } from './commands'

let statusBarItem: vscode.StatusBarItem

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('crp-scan')
  const provider = new CRPScanProvider(diagnosticCollection)

  context.subscriptions.push(diagnosticCollection)

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBarItem.command = 'crpScan.scanWorkspace'
  statusBarItem.text = '$(shield) CRP'
  statusBarItem.tooltip = 'Click to run CRP Scan'
  statusBarItem.show()
  context.subscriptions.push(statusBarItem)

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('crpScan.scanWorkspace', () =>
      scanWorkspace(diagnosticCollection, statusBarItem)
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

  context.subscriptions.push(
    vscode.commands.registerCommand('crpScan.showScanOutput', () => {
      showScanOutput()
    })
  )

  // Auto-scan on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
      const config = vscode.workspace.getConfiguration('crpScan')
      if (config.get<boolean>('autoScanOnSave', false)) {
        provider.scanDocument(doc, statusBarItem)
      }
    })
  )

  // Register code actions
  const selector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'python' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'java' },
    { scheme: 'file', language: 'go' },
    { scheme: 'file', language: 'rust' }
  ]

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(selector, provider)
  )

  // Auto-scan on open
  const config = vscode.workspace.getConfiguration('crpScan')
  if (config.get<boolean>('autoScanOnOpen', false)) {
    scanWorkspace(diagnosticCollection, statusBarItem)
  }
}

export function deactivate() {
  statusBarItem?.dispose()
}
