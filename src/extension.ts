import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.runSimulaFile",
    (uri: vscode.Uri) => {
      // Get the path of the selected file
      const filePath = uri.fsPath;

      // Open the terminal
      const terminal = vscode.window.createTerminal(`Simula: ${filePath}`);

      // Send the command to run the Simula file in the terminal
      // Expect output executable to be without the ".sim" extension, remove with regex
      const binary = filePath.replace(/\.sim$/, "");
      terminal.sendText(`gnucim ${filePath} --output="${binary}" && ${binary}`);

      // Show the terminal
      terminal.show();
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
