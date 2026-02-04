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
const CONFIG_PATH = '.github/agents/auto-activate.json';
let outputChannel;
function activate(context) {
    outputChannel = vscode.window.createOutputChannel('AEOS Activator');
    outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension activated`);
    // Run activation check after a short delay to ensure VS Code is fully ready
    setTimeout(() => {
        checkAndActivateAgent();
    }, 2000);
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
        outputChannel.appendLine('[AEOS] Opening chat with activation message...');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: config.message,
            isPartialQuery: false,
            mode: 'agent'
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
    if (outputChannel) {
        outputChannel.appendLine(`[${new Date().toISOString()}] AEOS Activator extension deactivated`);
        outputChannel.dispose();
    }
}
//# sourceMappingURL=extension.js.map