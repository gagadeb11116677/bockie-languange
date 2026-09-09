const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

function activate(context) {
  console.log('Bockie extension activated');

  // Command: Run current file
  const runFileDisposable = vscode.commands.registerCommand('bockie.runFile', function (uri) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }
    const doc = editor.document;
    if (doc.languageId !== 'bockie' && !doc.fileName.endsWith('.bckie')) {
      vscode.window.showErrorMessage('Not a Bockie file (.bckie)');
      return;
    }

    // Save if dirty
    if (doc.isDirty) {
      doc.save().then(saved => {
        if (saved) runBockieFile(doc.fileName);
      });
    } else {
      runBockieFile(doc.fileName);
    }
  });

  // Command: Open REPL
  const openReplDisposable = vscode.commands.registerCommand('bockie.openRepl', function () {
    const config = vscode.workspace.getConfiguration('bockie');
    const bockieBin = config.get('executablePath', 'bockie');
    const terminal = vscode.window.createTerminal('Bockie REPL');
    terminal.show();
    terminal.sendText(bockieBin);
  });

  context.subscriptions.push(runFileDisposable);
  context.subscriptions.push(openReplDisposable);

  // Auto-detect file language by extension
  vscode.workspace.onDidOpenTextDocument(doc => {
    if (doc.fileName.endsWith('.bckie') || doc.fileName.endsWith('.bockie')) {
      // VSCode auto-detects via contributes.languages
    }
  });
}

function runBockieFile(filePath) {
  const config = vscode.workspace.getConfiguration('bockie');
  const bockieBin = config.get('executablePath', 'bockie');
  const runInTerminal = config.get('runInTerminal', true);

  if (runInTerminal) {
    // Use integrated terminal
    let terminal = vscode.window.terminals.find(t => t.name === 'Bockie');
    if (!terminal) {
      terminal = vscode.window.createTerminal('Bockie');
    }
    terminal.show();
    
    // Quote path if it has spaces
    const quotedPath = `"${filePath}"`;
    terminal.sendText(`${bockieBin} run ${quotedPath}`);
  } else {
    // Use Output channel
    const output = vscode.window.createOutputChannel('Bockie');
    output.show(true);
    output.appendLine(`$ ${bockieBin} run "${filePath}"`);
    output.appendLine('');

    try {
      const result = execSync(`${bockieBin} run "${filePath}"`, {
        encoding: 'utf-8',
        timeout: 30000,
        cwd: path.dirname(filePath)
      });
      output.append(result);
    } catch (e) {
      output.appendLine(`Error: ${e.message}`);
      if (e.stderr) output.append(e.stderr);
    }
  }
}

function deactivate() {
  console.log('Bockie extension deactivated');
}

module.exports = { activate, deactivate };
