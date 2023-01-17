"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
/* eslint-disable eqeqeq */
const net_1 = require("net");
const util_1 = require("util");
const vscode = require("vscode");
let mController;
;
;
function activate(context) {
    context.subscriptions.push(vscode.workspace.registerNotebookSerializer('magma-notebook', new MagmaSerializer()));
    mController = new MagmaController();
}
exports.activate = activate;
function deactivate() {
    mController.clean();
}
exports.deactivate = deactivate;
class MagmaSerializer {
    async deserializeNotebook(content, _token) {
        var contents = new util_1.TextDecoder().decode(content);
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
            contents.push({ kind: cell.kind, language: cell.languageId, value: cell.value });
        }
        return new util_1.TextEncoder().encode(JSON.stringify(contents));
    }
}
class MagmaController {
    constructor() {
        this.controllerId = 'magma-notebook-controller-id';
        this.notebookType = 'magma-notebook';
        this.label = 'Magma Notebook';
        this.supportedLanguages = ['magma'];
        this.headerTrace = 'Type ? for help.  Type <Ctrl>-D to quit.';
        this.idEnd = "88D2838D615676DE69EB111082922B84BE50947BKamel";
        this.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.magmaActiveRuns = {};
        this._executionOrder = 0;
        this._app = "";
        this._port = 9001;
        this._controller = vscode.notebooks.createNotebookController(this.controllerId, this.notebookType, this.label);
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
        this.magmaActiveRuns = {};
        this._app = "";
        this._port = 9001;
        this.serverstarted = false;
    }
    _startMagmaServer() {
        return new Promise(async (resolve, reject) => {
            this._app = vscode.workspace.getConfiguration("magma").get("path");
            if (process.platform == 'darwin') {
                if (this._app.endsWith('/')) {
                    this._app += "magma";
                }
                else {
                    this._app += "/magma";
                }
            }
            else {
                if (process.platform == 'win32') {
                    if (this._app.endsWith('\\')) {
                        this._app += "magma";
                    }
                    else {
                        this._app += "\\magma.exe";
                    }
                }
                else if (process.platform == 'linux') { // TO DO .....}                              
                }
            }
            this._port = vscode.workspace.getConfiguration("magma").get("serverport");
            this.server = (0, net_1.createServer)((c) => {
                let spawn = require('child_process').spawn;
                var sh = spawn((this._app), []);
                sh.on('error', (err) => {
                    this.serverstarted = false;
                    resolve("");
                });
                c.pipe(sh.stdin);
                sh.stdout.pipe(c);
                sh.stderr.pipe(c);
            });
            this.server.listen(this._port);
            let cli = new net_1.Socket();
            cli.connect(this._port, '127.0.0.1', () => {
                cli.on('data', (data) => {
                    this.serverstarted = data.indexOf(this.headerTrace) != -1;
                    resolve('');
                });
            });
        });
    }
    _connectNewClient(notebookId) {
        return new Promise(async (resolve, reject) => {
            var received = "";
            this.magmaActiveRuns[notebookId].socket.connect(this._port, '127.0.0.1', () => {
                this.magmaActiveRuns[notebookId].socket.setEncoding('utf-8');
                this.magmaActiveRuns[notebookId].socket.on('data', (data) => {
                    if (data.indexOf(this.headerTrace) != -1) {
                        if (this.magmaActiveRuns[notebookId].header == "") {
                            this.magmaActiveRuns[notebookId].header = data.replace(/\r?\n|\r/g, "").replace(this.headerTrace, '');
                            resolve("");
                        }
                    }
                    else {
                        received = data.replace('print("' + this.idEnd + '");', '');
                        this.magmaActiveRuns[notebookId].activeoutput += received.replace(this.idEnd, "");
                        this.magmaActiveRuns[notebookId].outputcell.replaceOutput([new vscode.NotebookCellOutput([
                                vscode.NotebookCellOutputItem.text(this.magmaActiveRuns[notebookId].activeoutput)
                            ])]);
                        this.magmaActiveRuns[notebookId].codeRunEnd = (received.indexOf(this.idEnd) > -1);
                    }
                });
            });
        });
    }
    ;
    _runMagmaCode(notebookId, magmacode) {
        return new Promise(async (resolve, reject) => {
            if (magmacode.slice(-1) != ";") {
                magmacode += ";";
            }
            this.magmaActiveRuns[notebookId].socket.write(magmacode + 'print("' + this.idEnd + '");\r\n');
            while (!this.magmaActiveRuns[notebookId].codeRunEnd) {
                await this.delay(10);
            }
            ;
            resolve("");
        });
    }
    ;
    _execute(cells, _notebook, _controller) { for (let cell of cells) {
        this._doExecution(cell, _notebook);
    } }
    async _doExecution(cell, notebook) {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        let notebookid = notebook.uri.toString(true);
        if (!this.serverstarted) {
            await this._startMagmaServer();
        }
        if (this.serverstarted) {
            if (this.magmaActiveRuns[notebookid] == undefined) {
                this.magmaActiveRuns[notebookid] = { socket: new net_1.Socket(), context: undefined, outputcell: execution, codeRunEnd: true,
                    header: "", activeoutput: "" };
                this.magmaActiveRuns[notebookid].context = this._connectNewClient(notebookid);
            }
            if (this.magmaActiveRuns[notebookid].codeRunEnd) {
                execution.start(Date.now());
                this.magmaActiveRuns[notebookid].codeRunEnd = false;
                this.magmaActiveRuns[notebookid].activeoutput = "";
                this.magmaActiveRuns[notebookid].outputcell = execution;
                this.magmaActiveRuns[notebookid].outputcell.clearOutput();
                let code = cell.document.getText();
                this.magmaActiveRuns[notebookid].context = this.magmaActiveRuns[notebookid].context
                    .then(() => this._runMagmaCode(notebookid, code)
                    .then(() => { execution.end(true, Date.now()); }));
            }
        }
        else {
            execution.end(false);
            let goToSetting = 'Go to Magma settings';
            vscode.window.showErrorMessage('Unable to start the "Magma" interpreter.' + "\r\n" + 'Please revise the corresponding settings.', goToSetting)
                .then(selection => {
                if (selection === goToSetting) {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'magma');
                }
            });
        }
    }
    clean() { this.server.unref(); }
}
//# sourceMappingURL=extension.js.map