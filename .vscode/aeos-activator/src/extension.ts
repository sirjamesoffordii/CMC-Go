import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = '.github/agents/auto-activate.json';

interface AutoActivateConfig {
  role: string;
  agent: string;
  message: string;
}

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AEOS Activator');
  outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension activated`);

  // Run activation check after a short delay to ensure VS Code is fully ready
  setTimeout(() => {
    checkAndActivateAgent();
  }, 2000);
}

async function checkAndActivateAgent(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('[AEOS] No workspace folder found');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const configFilePath = path.join(workspaceRoot, CONFIG_PATH);

  outputChannel.appendLine(`[AEOS] Checking for config at: ${configFilePath}`);

  if (!fs.existsSync(configFilePath)) {
    outputChannel.appendLine('[AEOS] No auto-activate config found - skipping activation');
    return;
  }

  try {
    // Read the config file
    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    const config: AutoActivateConfig = JSON.parse(configContent);

    outputChannel.appendLine(`[AEOS] Found config for role: ${config.role} (${config.agent})`);
    outputChannel.appendLine(`[AEOS] Activation message: ${config.message}`);

    // Delete the config file BEFORE executing command (one-time trigger)
    fs.unlinkSync(configFilePath);
    outputChannel.appendLine('[AEOS] Config file deleted');

    // Execute the chat open command with the activation message
    outputChannel.appendLine('[AEOS] Opening chat with activation message...');
    
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: config.message,
      isPartialQuery: false,
      mode: 'agent'
    });

    outputChannel.appendLine(`[AEOS] ✓ Agent ${config.role} activated successfully`);

  } catch (error) {
    outputChannel.appendLine(`[AEOS] ERROR: ${error instanceof Error ? error.message : String(error)}`);
    
    // Show error to user
    vscode.window.showErrorMessage(`AEOS Activator: Failed to activate agent - ${error}`);
  }
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension deactivated`);
    outputChannel.dispose();
  }
}
