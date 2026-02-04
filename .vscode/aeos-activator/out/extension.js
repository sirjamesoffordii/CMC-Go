"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
const CONFIG_PATH = '.github/agents/auto-activate.json';
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const TERMINAL_HUNG_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without output = potentially hung
let outputChannel;
let configWatcher;
let heartbeatTimer;
let currentRole;
let terminalStates = new Map();
let lastTerminalActivityTime = Date.now();
function activate(context) {
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
        }
        else {
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
        }
        else {
            vscode.window.showInformationMessage(`AEOS: Terminals OK. Last activity ${Math.round(status.idleMinutes)} min ago.`);
        }
    });
    context.subscriptions.push(terminalStatusCommand);
}
function setupConfigWatcher(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
    }
    const pattern = new vscode.RelativePattern(workspaceFolders[0], CONFIG_PATH);
    configWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    // When config file is created or changed, trigger activation
    configWatcher.onDidCreate(() => {
        outputChannel.appendLine('[AEOS] Config file created - triggering activation');
        setTimeout(() => checkAndActivateAgent(), 500); // Small delay to ensure file is written
    });
    configWatcher.onDidChange(() => {
        outputChannel.appendLine('[AEOS] Config file changed - triggering activation');
        setTimeout(() => checkAndActivateAgent(), 500);
    });
    context.subscriptions.push(configWatcher);
    outputChannel.appendLine('[AEOS] File watcher set up for config changes');
}
async function checkAndActivateAgent() {
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
        const config = JSON.parse(configContent);
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
    }
    catch (error) {
        outputChannel.appendLine(`[AEOS] ERROR: ${error instanceof Error ? error.message : String(error)}`);
        // Show error to user
        vscode.window.showErrorMessage(`AEOS Activator: Failed to activate agent - ${error}`);
    }
}
function deactivate() {
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
function detectAgentRole() {
    // Check process arguments for user-data-dir
    const args = process.argv.join(' ');
    if (args.includes('vscode-agent-pe')) {
        return 'PE';
    }
    else if (args.includes('vscode-agent-tl')) {
        return 'TL';
    }
    else if (args.includes('vscode-agent-se')) {
        return 'SE';
    }
    // Also check environment variable that VS Code sets
    const userDataDir = process.env.VSCODE_PORTABLE || process.env.VSCODE_IPC_HOOK_CLI || '';
    if (userDataDir.includes('vscode-agent-pe')) {
        return 'PE';
    }
    else if (userDataDir.includes('vscode-agent-tl')) {
        return 'TL';
    }
    else if (userDataDir.includes('vscode-agent-se')) {
        return 'SE';
    }
    return undefined;
}
/**
 * Start the automatic heartbeat timer.
 */
function startHeartbeatTimer(context) {
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
function updateHeartbeat(role, status) {
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
        }
        else {
            outputChannel.appendLine(`[AEOS] ♥ Heartbeat: ${role} = ${finalStatus}`);
        }
    });
}
/**
 * Start monitoring terminal activity to detect hung commands.
 * Uses shell integration when available, otherwise polls terminal state.
 */
function startTerminalMonitoring(context) {
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
        const startExecListener = vscode.window.onDidStartTerminalShellExecution((event) => {
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
        const endExecListener = vscode.window.onDidEndTerminalShellExecution((event) => {
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
    }
    else {
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
function getTerminalStatus() {
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
//# sourceMappingURL=extension.js.map