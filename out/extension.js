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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let snippets;
function activate(context) {
    const userSnippetsPath = getUserSnippetsPath();
    const autocompletePath = vscode.workspace.getConfiguration('vanessashortcuts').get('autocompletePath', 'snippets/VA_Snippets.code-snippets');
    const userSnippetsIsAbsolute = path.isAbsolute(autocompletePath);
    const extensionSnippetsPath = userSnippetsIsAbsolute ? autocompletePath : path.join(context.extensionPath, autocompletePath);
    fs.copyFile(extensionSnippetsPath, userSnippetsPath, (err) => {
        if (err) {
            vscode.window.showErrorMessage('Не удалось скопировать сниппеты в пользовательскую директорию.');
            console.error('Ошибка при копировании файла сниппетов:', err);
        }
        else {
            vscode.window.showInformationMessage('Файл сниппетов успешно скопирован в каталог пользовательских сниппетов.');
            console.log('Файл сниппетов успешно скопирован в каталог пользовательских сниппетов.');
        }
    });
    const snippetsPath = vscode.workspace.getConfiguration('vanessashortcuts').get('snippetsPath', 'snippets/snippets.json');
    const isAbsolute = path.isAbsolute(snippetsPath);
    const fullPath = isAbsolute ? snippetsPath : path.join(context.extensionPath, snippetsPath);
    fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при загрузке файла сниппетов:', err);
            vscode.window.showErrorMessage('Не удалось загрузить сниппеты. Пожалуйста, проверьте консоль для деталей.');
            return;
        }
        snippets = JSON.parse(data);
        let disposable = vscode.commands.registerCommand('vanessashortcuts.complexSnippet', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Текстовый редактор не найден!');
                return;
            }
            editor.selections.forEach(selection => {
                const currentLine = editor.document.lineAt(selection.start.line).text;
                if (!currentLine.match(/^\s*[a-zA-Z]+\([^\)]*\)\s*(\s;\s|;|\s>\s|>|\n|\s\n|$)/)) {
                    if (editor.document.getWordRangeAtPosition(selection.active) && vscode.window.activeTextEditor?.selection.isEmpty) {
                        vscode.commands.executeCommand('editor.action.triggerSuggest');
                    }
                    else {
                        vscode.commands.executeCommand('tab');
                    }
                    return;
                }
                const range = new vscode.Range(selection.start.line, 0, selection.end.line, editor.document.lineAt(selection.end.line).text.length);
                const text = editor.document.getText(range);
                const commands = parseCommandString(text);
                if (commands) {
                    insertComplexSnippet(editor, commands, range);
                }
                else {
                    vscode.window.showErrorMessage('Некорректный формат команды');
                }
            });
        });
        context.subscriptions.push(disposable);
    });
}
exports.activate = activate;
function getUserSnippetsPath() {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'snippets', 'VA_Snippets.code-snippets');
}
function parseCommandString(line) {
    const commandStrings = line.split(/\s;\s|;|\s>\s|>|(\r\n|\r|\n)/)
        .map(cmd => cmd ? cmd.trim() : '')
        .filter(cmd => cmd.length > 0);
    return commandStrings.map(cmdStr => {
        const match = cmdStr.match(/(\w+)\(([^)]*)\)/);
        if (match) {
            const params = match[2].split(',').map(p => p.trim());
            return { type: match[1], params };
        }
        else {
            return { type: cmdStr, params: [] };
        }
    });
}
function insertComplexSnippet(editor, commands, range) {
    const snippetStrings = commands.map(command => {
        const snippetTemplate = snippets[command.type]?.template;
        if (snippetTemplate) {
            return processSnippet(snippetTemplate, command.params);
        }
        return command.type;
    }).join('\n');
    if (snippetStrings.trim().length > 0) {
        editor.edit(editBuilder => {
            editBuilder.replace(range, snippetStrings);
        });
    }
}
function processSnippet(template, params) {
    let snippetString = template.join('\n');
    if (template.join().includes('$param1') && template.join().includes('$param2')) {
        const param1 = params[0] || '';
        const param2 = params[1] || '';
        const date = getCurrentDate();
        const uid = generateUUID();
        snippetString = snippetString.replace(/\$param1/g, param1).replace(/\$param2/g, param2).replace(/\$date/g, date).replace(/\$UUID/g, uid);
    }
    else {
        if (template.join().includes('$date')) {
            const date = getCurrentDate();
            snippetString = snippetString.replace(/\$date/g, date);
        }
        const count = params.length > 0 ? parseInt(params[0], 10) : 1;
        if (!isNaN(count)) {
            snippetString = Array(count).fill(snippetString).join('\n');
        }
    }
    return snippetString;
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function getCurrentDate() {
    const today = new Date();
    const yyyy = today.getFullYear().toString();
    let mm = (today.getMonth() + 1).toString();
    let dd = today.getDate().toString();
    if (dd.length < 2) {
        dd = '0' + dd;
    }
    if (mm.length < 2) {
        mm = '0' + mm;
    }
    return mm + '/' + dd + '/' + yyyy + ' 12:00:00 AM';
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map