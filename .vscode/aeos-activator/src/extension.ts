import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

// Config path is now per-agent to avoid overwrites when multiple agents share workspace
const CONFIG_PATH_TEMPLATE = '.github/agents/auto-activate-{ROLE}.json';
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const TERMINAL_HUNG_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without output = potentially hung

interface AutoActivateConfig {
  role: string;
  agent: string;
  message: string;
}

interface TerminalState {
  lastOutputTime: number;
  lastOutputSnippet: string;
  isRunning: boolean;
}

let outputChannel: vscode.OutputChannel;
let configWatcher: vscode.FileSystemWatcher | undefined;
let heartbeatTimer: NodeJS.Timeout | undefined;
let currentRole: string | undefined;
let terminalStates: Map<string, TerminalState> = new Map();
let lastTerminalActivityTime: number = Date.now();

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AEOS Activator');
  outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension activated`);

  // Detect agent role from user-data-dir
  currentRole = detectAgentRole();
  if (currentRole) {
    outputChannel.appendLine(`[AEOS] Detected role: ${currentRole}`);
    // Start heartbeat timer
    startHeartbeatTimer(context);
    // Start terminal monitoring
    startTerminalMonitoring(context);
  }

  // Run activation check after a short delay to ensure VS Code is fully ready
  setTimeout(() => {
    checkAndActivateAgent();
  }, 2000);

  // Set up file watcher for config changes (handles respawn without VS Code restart)
  setupConfigWatcher(context);

  // Register manual activation command
  const activateCommand = vscode.commands.registerCommand('aeos.activate', () => {
    outputChannel.appendLine('[AEOS] Manual activation triggered');
    checkAndActivateAgent();
  });
  context.subscriptions.push(activateCommand);

  // Register heartbeat command for manual trigger
  const heartbeatCommand = vscode.commands.registerCommand('aeos.heartbeat', () => {
    if (currentRole) {
      updateHeartbeat(currentRole, 'manual-ping');
    } else {
      vscode.window.showWarningMessage('AEOS: No agent role detected for this instance');
    }
  });
  context.subscriptions.push(heartbeatCommand);

  // Register command to check terminal status
  const terminalStatusCommand = vscode.commands.registerCommand('aeos.terminalStatus', () => {
    const status = getTerminalStatus();
    outputChannel.appendLine(`[AEOS] Terminal status: ${JSON.stringify(status, null, 2)}`);
    if (status.potentiallyHung) {
      vscode.window.showWarningMessage(`AEOS: Terminal may be hung! No output for ${Math.round(status.idleMinutes)} minutes.`);
    } else {
      vscode.window.showInformationMessage(`AEOS: Terminals OK. Last activity ${Math.round(status.idleMinutes)} min ago.`);
    }
  });
  context.subscriptions.push(terminalStatusCommand);
}

function setupConfigWatcher(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  // Only watch for THIS agent's config file (not all roles)
  if (!currentRole) {
    outputChannel.appendLine('[AEOS] No role detected - cannot set up config watcher');
    return;
  }
  
  const pattern = new vscode.RelativePattern(workspaceFolders[0], `.github/agents/auto-activate-${currentRole}.json`);
  configWatcher = vscode.workspace.createFileSystemWatcher(pattern);

  outputChannel.appendLine(`[AEOS] Watching for config: auto-activate-${currentRole}.json only`);

  // When config file is created or changed, trigger activation
  configWatcher.onDidCreate((uri) => {
    outputChannel.appendLine(`[AEOS] Config file created: ${uri.fsPath} - triggering activation for ${currentRole}`);
    setTimeout(() => checkAndActivateAgent(), 500); // Small delay to ensure file is written
  });

  configWatcher.onDidChange((uri) => {
    outputChannel.appendLine(`[AEOS] Config file changed: ${uri.fsPath} - triggering activation for ${currentRole}`);
    setTimeout(() => checkAndActivateAgent(), 500);
  });

  context.subscriptions.push(configWatcher);
  outputChannel.appendLine('[AEOS] File watcher set up for config changes');
}

async function checkAndActivateAgent(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('[AEOS] No workspace folder found');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  
  // Use detected role to find the correct config file
  // This ensures PE reads auto-activate-PE.json, TL reads auto-activate-TL.json, etc.
  if (!currentRole) {
    outputChannel.appendLine('[AEOS] No role detected - cannot determine config file');
    return;
  }
  
  const configFilePath = path.join(workspaceRoot, `.github/agents/auto-activate-${currentRole}.json`);

  outputChannel.appendLine(`[AEOS] Checking for config at: ${configFilePath}`);

  if (!fs.existsSync(configFilePath)) {
    outputChannel.appendLine(`[AEOS] No auto-activate config found for ${currentRole} - skipping activation`);
    return;
  }

  try {
    // Read the config file
    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    const config: AutoActivateConfig = JSON.parse(configContent);

    // Verify the config is for this role
    if (config.role !== currentRole) {
      outputChannel.appendLine(`[AEOS] Config role mismatch: expected ${currentRole}, got ${config.role} - skipping`);
      return;
    }

    outputChannel.appendLine(`[AEOS] Found config for role: ${config.role} (${config.agent})`);
    outputChannel.appendLine(`[AEOS] Activation message: ${config.message}`);

    // Delete the config file BEFORE executing command (one-time trigger)
    fs.unlinkSync(configFilePath);
    outputChannel.appendLine('[AEOS] Config file deleted');

    // Execute the chat open command with the activation message
    // Prefix with agent mention to select the specific custom agent
    const agentSlug = config.agent.toLowerCase().replace(/\s+/g, '-');
    const queryWithAgent = `@${agentSlug} ${config.message}`;
    
    outputChannel.appendLine(`[AEOS] Opening chat with agent: @${agentSlug}`);
    outputChannel.appendLine(`[AEOS] Full query: ${queryWithAgent}`);
    
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: queryWithAgent,
      isPartialQuery: false
    });

    outputChannel.appendLine(`[AEOS] ✓ Agent ${config.role} activated successfully`);

  } catch (error) {
    outputChannel.appendLine(`[AEOS] ERROR: ${error instanceof Error ? error.message : String(error)}`);
    
    // Show error to user
    vscode.window.showErrorMessage(`AEOS Activator: Failed to activate agent - ${error}`);
  }
}

export function deactivate() {
  // Stop heartbeat timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  
  if (outputChannel) {
    outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension deactivated`);
    outputChannel.dispose();
  }
}

/**
 * Detect agent role based on the user-data-dir of this VS Code instance.
 */
function detectAgentRole(): string | undefined {
  // Check process arguments for user-data-dir
  const args = process.argv.join(' ');
  
  if (args.includes('vscode-agent-pe')) {
    return 'PE';
  } else if (args.includes('vscode-agent-tl')) {
    return 'TL';
  } else if (args.includes('vscode-agent-se')) {
    return 'SE';
  }
  
  // Also check environment variable that VS Code sets
  const userDataDir = process.env.VSCODE_PORTABLE || process.env.VSCODE_IPC_HOOK_CLI || '';
  if (userDataDir.includes('vscode-agent-pe')) {
    return 'PE';
  } else if (userDataDir.includes('vscode-agent-tl')) {
    return 'TL';
  } else if (userDataDir.includes('vscode-agent-se')) {
    return 'SE';
  }
  
  return undefined;
}

/**
 * Start the automatic heartbeat timer.
 */
function startHeartbeatTimer(context: vscode.ExtensionContext) {
  if (!currentRole) {
    return;
  }
  
  outputChannel.appendLine(`[AEOS] Starting heartbeat timer for ${currentRole} (every ${HEARTBEAT_INTERVAL_MS / 1000}s)`);
  
  // Initial heartbeat
  updateHeartbeat(currentRole, 'extension-active');
  
  // Set up interval
  heartbeatTimer = setInterval(() => {
    if (currentRole) {
      updateHeartbeat(currentRole, 'extension-alive');
    }
  }, HEARTBEAT_INTERVAL_MS);
  
  // Ensure timer is cleaned up on deactivation
  context.subscriptions.push({
    dispose: () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    }
  });
}

/**
 * Update the heartbeat file for this agent.
 */
function updateHeartbeat(role: string, status: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }
  
  // Check terminal status and append to status if potentially hung
  const terminalStatus = getTerminalStatus();
  let finalStatus = status;
  if (terminalStatus.potentiallyHung) {
    finalStatus = `${status}-HUNG-${Math.round(terminalStatus.idleMinutes)}m`;
    outputChannel.appendLine(`[AEOS] ⚠️ Terminal may be hung! No output for ${Math.round(terminalStatus.idleMinutes)} minutes`);
  }
  
  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const scriptPath = path.join(workspaceRoot, 'scripts', 'update-heartbeat.ps1');
  
  if (!fs.existsSync(scriptPath)) {
    outputChannel.appendLine(`[AEOS] Heartbeat script not found: ${scriptPath}`);
    return;
  }
  
  // Run the PowerShell script
  const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Role ${role} -Status "${finalStatus}"`;
  
  cp.exec(command, { cwd: workspaceRoot }, (error, stdout, stderr) => {
    if (error) {
      outputChannel.appendLine(`[AEOS] Heartbeat update failed: ${error.message}`);
    } else {
      outputChannel.appendLine(`[AEOS] ♥ Heartbeat: ${role} = ${finalStatus}`);
    }
  });
}

/**
 * Start monitoring terminal activity to detect hung commands.
 * Uses shell integration when available, otherwise polls terminal state.
 */
function startTerminalMonitoring(context: vscode.ExtensionContext) {
  outputChannel.appendLine('[AEOS] Starting terminal activity monitoring');
  
  // Track terminal open/close
  const openListener = vscode.window.onDidOpenTerminal((terminal) => {
    outputChannel.appendLine(`[AEOS] Terminal opened: ${terminal.name}`);
    lastTerminalActivityTime = Date.now();
    terminalStates.set(terminal.name, {
      lastOutputTime: Date.now(),
      lastOutputSnippet: 'opened',
      isRunning: true
    });
  });
  context.subscriptions.push(openListener);
  
  const closeListener = vscode.window.onDidCloseTerminal((terminal) => {
    outputChannel.appendLine(`[AEOS] Terminal closed: ${terminal.name}`);
    lastTerminalActivityTime = Date.now();
    terminalStates.delete(terminal.name);
  });
  context.subscriptions.push(closeListener);
  
  // Monitor active terminal changes (indicates user/agent interaction)
  const activeListener = vscode.window.onDidChangeActiveTerminal((terminal) => {
    if (terminal) {
      outputChannel.appendLine(`[AEOS] Active terminal changed: ${terminal.name}`);
      lastTerminalActivityTime = Date.now();
    }
  });
  context.subscriptions.push(activeListener);
  
  // Use shell integration to detect command execution (VS Code 1.93+)
  if ('onDidStartTerminalShellExecution' in vscode.window) {
    const startExecListener = (vscode.window as any).onDidStartTerminalShellExecution((event: any) => {
      outputChannel.appendLine(`[AEOS] Command started in terminal: ${event.terminal?.name || 'unknown'}`);
      lastTerminalActivityTime = Date.now();
      if (event.terminal) {
        terminalStates.set(event.terminal.name, {
          lastOutputTime: Date.now(),
          lastOutputSnippet: 'command-started',
          isRunning: true
        });
      }
    });
    context.subscriptions.push(startExecListener);
    
    const endExecListener = (vscode.window as any).onDidEndTerminalShellExecution((event: any) => {
      outputChannel.appendLine(`[AEOS] Command ended in terminal: ${event.terminal?.name || 'unknown'} (exit: ${event.exitCode})`);
      lastTerminalActivityTime = Date.now();
      if (event.terminal) {
        terminalStates.set(event.terminal.name, {
          lastOutputTime: Date.now(),
          lastOutputSnippet: `exit-${event.exitCode}`,
          isRunning: false
        });
      }
    });
    context.subscriptions.push(endExecListener);
    
    outputChannel.appendLine('[AEOS] Shell integration events available - using command start/end detection');
  } else {
    outputChannel.appendLine('[AEOS] Shell integration events not available - using basic terminal tracking');
  }
  
  // Initialize with existing terminals
  for (const terminal of vscode.window.terminals) {
    terminalStates.set(terminal.name, {
      lastOutputTime: Date.now(),
      lastOutputSnippet: 'existing',
      isRunning: true
    });
  }
  
  outputChannel.appendLine(`[AEOS] Tracking ${vscode.window.terminals.length} existing terminals`);
}

/**
 * Get current terminal status - is anything potentially hung?
 */
function getTerminalStatus(): { potentiallyHung: boolean; idleMinutes: number; terminalCount: number } {
  const now = Date.now();
  const idleMs = now - lastTerminalActivityTime;
  const idleMinutes = idleMs / (60 * 1000);
  const terminalCount = vscode.window.terminals.length;
  
  // Consider potentially hung if:
  // 1. There are open terminals
  // 2. No terminal output for > threshold
  const potentiallyHung = terminalCount > 0 && idleMs > TERMINAL_HUNG_THRESHOLD_MS;
  
  return {
    potentiallyHung,
    idleMinutes,
    terminalCount
  };
}
