const vscode = require('vscode');
const path = require('path');

const jsLog = ({ text, fileName, line }) => `console.log('🚧 -> file: ${fileName} ~ line: ${line}。 ${text}: ', ${text});`;

const dartLog = ({ text, fileName, line }) => `print('🚧 -> file: ${fileName} ~ line: ${line}。 ${text}: ` + "${" + text + "}');";

const tempFileLog = ({ text }) => `console.log('🚧 -> ${text}: ', ${text});`;

const langLog = {
    '.js': jsLog,
    '.jsx': jsLog,
    '.ts': jsLog,
    '.tsx': jsLog,
    '.vue': jsLog,
    '.dart': dartLog,
    '': tempFileLog,
};

const insertText = (val) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('Can\'t insert log because no document is open');
        return;
    }

    const selection = editor.selection;

    const range = new vscode.Range(selection.start, selection.end);

    editor.edit((editBuilder) => {
        editBuilder.replace(range, val);
    });
}

function getAllLogStatements(document, documentText) {
    let logStatements = [];

    const logRegex = /console.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)\((.*)\);?/g;
    let match;
    while (match = logRegex.exec(documentText)) {
        let matchRange =
            new vscode.Range(
                document.positionAt(match.index),
                document.positionAt(match.index + match[0].length)
            );
        if (!matchRange.isEmpty)
            logStatements.push(matchRange);
    }
    return logStatements;
}

function deleteFoundLogStatements(workspaceEdit, docUri, logs) {
    logs.forEach((log) => {
        workspaceEdit.delete(docUri, log);
    });

    vscode.workspace.applyEdit(workspaceEdit).then(() => {
        logs.length > 1
            ? vscode.window.showInformationMessage(`${logs.length} console.logs deleted`)
            : vscode.window.showInformationMessage(`${logs.length} console.log deleted`);
    });
}

function activate(context) {
    console.log('console-log-utils is now active');

    const insertLogStatement = vscode.commands.registerCommand('extension.insertLogStatement', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const { base, ext } = path.parse(editor.document.fileName);
        text
            ? vscode.commands.executeCommand('editor.action.insertLineAfter')
                .then(() => {
                    const opt = { text, fileName: base, line: editor.selection.active.line + 1 }
                    const logFn = langLog[ext];
                    const logToInsert = logFn ? logFn(opt) : 'console.log();';
                    insertText(logToInsert);
                })
            : insertText('console.log();');

    });
    context.subscriptions.push(insertLogStatement);

    const insertLogStatementJsonStringify = vscode.commands.registerCommand('extension.insertLogStatementJsonStringify', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        text
            ? vscode.commands.executeCommand('editor.action.insertLineAfter')
                .then(() => {
                    const logToInsert = `console.log('JSON.stringify -> ${text}: ', JSON.stringify(${text}));`;
                    insertText(logToInsert);
                })
            : insertText('console.log();');

    });
    context.subscriptions.push(insertLogStatementJsonStringify);

    const deleteAllLogStatements = vscode.commands.registerCommand('extension.deleteAllLogStatements', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const document = editor.document;
        const documentText = editor.document.getText();

        let workspaceEdit = new vscode.WorkspaceEdit();

        const logStatements = getAllLogStatements(document, documentText);

        deleteFoundLogStatements(workspaceEdit, document.uri, logStatements);
    });
    context.subscriptions.push(deleteAllLogStatements);
}
exports.activate = activate;

function deactivate() {
}

exports.deactivate = deactivate;
