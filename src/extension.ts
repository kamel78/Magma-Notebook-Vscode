/* eslint-disable eqeqeq */
import { Socket,Server,createServer } from 'net';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';

let mController:MagmaController;

interface RawNotebookCell {	language: string;
                            value: string;
                            kind: vscode.NotebookCellKind;
                          }
interface NotebookRunData{ socket: Socket ;
                           context:any;
                           outputcell:vscode.NotebookCellExecution;
                           codeRunEnd:boolean;
                           header:string;
                           activeoutput:string;
                         };
interface ActiveNotebooksRuns{[index:string]:NotebookRunData};                         

export function activate(context: vscode.ExtensionContext) 
                                    { context.subscriptions.push(vscode.workspace.registerNotebookSerializer('magma-notebook', new MagmaSerializer()));
                                      mController=new MagmaController();                                   
                                    }
export function deactivate() {  
                              mController.clean();
                              }                                 

class MagmaSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(content: Uint8Array,
                            _token: vscode.CancellationToken
                          ): Promise<vscode.NotebookData> {var contents = new TextDecoder().decode(content);
                                                          let raw: RawNotebookCell[];
                                                          try {raw = <RawNotebookCell[]>JSON.parse(contents);
                                                              } catch {raw = [];}
                                                          const cells = raw.map(item => new vscode.NotebookCellData(item.kind, item.value, item.language));
                                                          return new vscode.NotebookData(cells);
                                                          }
  async serializeNotebook(data: vscode.NotebookData,
                          _token: vscode.CancellationToken
                        ): Promise<Uint8Array> {let contents: RawNotebookCell[] = [];
                                                for (const cell of data.cells) {
                                                contents.push({kind: cell.kind,language: cell.languageId,value: cell.value});
                                                }
                                                return new TextEncoder().encode(JSON.stringify(contents));
                                                }
                        }

class MagmaController {
  readonly controllerId = 'magma-notebook-controller-id';
  readonly notebookType = 'magma-notebook';
  readonly label = 'Magma Notebook';
  readonly supportedLanguages = ['magma'];
  
  readonly headerTrace:string='Type ? for help.  Type <Ctrl>-D to quit.';
  readonly idEnd:string="88D2838D615676DE69EB111082922B84BE50947BKamel";
  readonly delay = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms));
  
  private server!: Server;
  private magmaActiveRuns={} as ActiveNotebooksRuns;
  private readonly _controller: vscode.NotebookController;
  private _executionOrder = 0;
  private _app:string="";
  private _port:number=9001;
  private serverstarted:boolean;

  constructor() {this._controller = vscode.notebooks.createNotebookController(this.controllerId,this.notebookType,this.label);
                                                this._controller.supportedLanguages = this.supportedLanguages;
                                                this._controller.supportsExecutionOrder = true;
                                                this._controller.executeHandler = this._execute.bind(this);
                                                this.magmaActiveRuns={};
                                                this._app="";
                                                this._port=9001;
                                                this.serverstarted=false;
                                                }
  private _startMagmaServer (){
    return new Promise(async  (resolve,reject) =>  { this._app =<string>vscode.workspace.getConfiguration( "magma").get("path");
                                                     if (process.platform=='darwin') { if (this._app.endsWith('/')){this._app+="magma";}
                                                                                       else {this._app+="/magma";}
                                                                                      }
                                                     else {if (process.platform=='win32') { if (this._app.endsWith('\\')){this._app+="magma";}
                                                                                           else {this._app+="\\magma.exe";}
                                                                                           }
                                                          else if (process.platform=='linux')  { // TO DO .....}                              
                                                          }}                              
                                                     this._port=<number>vscode.workspace.getConfiguration( "magma").get("serverport");
                                                     this.server= createServer( (c: { pipe: (arg0: any) => void; }) => {                          
                                                                                             let spawn= require('child_process').spawn;
                                                                                             var sh = spawn((this._app), []);
                                                                                             sh.on('error',(err: string)=> {
                                                                                                            this.serverstarted=false;
                                                                                                            resolve(""); 
                                                                                                            });
                                                                                             c.pipe(sh.stdin);
                                                                                             sh.stdout.pipe(c);
                                                                                             sh.stderr.pipe(c);
                                                                                             });
                                                     this.server.listen(this._port);
                                                     let cli=new Socket();
                                                     cli.connect(this._port, '127.0.0.1',()=>{cli.on('data',(data:string)=>
                                                                                                        {this.serverstarted=data.indexOf(this.headerTrace)!=-1;                                                                 
                                                                                                        resolve(''); 
                                                                                                        });
                                                                                              });   
                                                    }); }
  private _connectNewClient(notebookId:string) {return  new Promise(async (resolve, reject) =>{
                                                var received:string="";                                                          
                                                this.magmaActiveRuns[notebookId].socket.connect(this._port, '127.0.0.1', 
                                                  ()=> {this.magmaActiveRuns[notebookId].socket.setEncoding('utf-8');
                                                        this.magmaActiveRuns[notebookId].socket.on('data', 
                                                               (data: string)=> {
                                                                if (data.indexOf(this.headerTrace)!=-1)
                                                                  {if (this.magmaActiveRuns[notebookId].header=="")
                                                                      {this.magmaActiveRuns[notebookId].header=data.replace(/\r?\n|\r/g, "").replace(this.headerTrace,'');
                                                                   resolve("");
                                                                      }}
                                                                else {received=data.replace('print("'+this.idEnd+'");','');                                                                                          
                                                                        this.magmaActiveRuns[notebookId].activeoutput+=received.replace(this.idEnd,"");  
                                                                        this.magmaActiveRuns[notebookId].outputcell.replaceOutput
                                                                        ([new vscode.NotebookCellOutput([        
                                                                           vscode.NotebookCellOutputItem.text(this.magmaActiveRuns[notebookId].activeoutput) 
                                                                         ])]);
                                                                      this.magmaActiveRuns[notebookId].codeRunEnd=(received.indexOf(this.idEnd)>-1);
                                                                      }                                               
                                                                });});});
                                            };       
  private _runMagmaCode (notebookId:string,magmacode: string) {
                      return  new Promise(async  (resolve, reject)=> {if (magmacode.slice(-1)!=";"){magmacode+=";";}
                                                                      this.magmaActiveRuns[notebookId].socket.write(magmacode+'print("'+this.idEnd+'");\r\n');                                
                                                                      while (!this.magmaActiveRuns[notebookId].codeRunEnd){await this.delay(10);};                                   
                                                                      resolve("");       
                                                                      });
                                                              };                                                                                                                                                                       

  private _execute(cells: vscode.NotebookCell[],
                   _notebook: vscode.NotebookDocument,
                   _controller: vscode.NotebookController
                    ): void {for (let cell of cells) {this._doExecution(cell,_notebook);}}

  private async _doExecution(cell: vscode.NotebookCell,notebook:vscode.NotebookDocument):
             Promise<void> { const execution = this._controller.createNotebookCellExecution(cell);
                            execution.executionOrder = ++this._executionOrder;                          
                            let notebookid=notebook.uri.toString(true); 
                            if (!this.serverstarted){await this._startMagmaServer(); }
                            if (this.serverstarted){
                                  if (this.magmaActiveRuns[notebookid]==undefined)
                                      {this.magmaActiveRuns[notebookid] ={socket:new Socket(),context:undefined,outputcell:execution,codeRunEnd:true,
                                                                          header:"",activeoutput:""};
                                      this.magmaActiveRuns[notebookid].context=this._connectNewClient(notebookid);
                                      }           
                                  if (this.magmaActiveRuns[notebookid].codeRunEnd)
                                          { execution.start(Date.now()); 
                                            this.magmaActiveRuns[notebookid].codeRunEnd=false;     
                                            this.magmaActiveRuns[notebookid].activeoutput="";     
                                            this.magmaActiveRuns[notebookid].outputcell=execution;
                                            this.magmaActiveRuns[notebookid].outputcell.clearOutput();
                                            let code = cell.document.getText();         
                                            this.magmaActiveRuns[notebookid].context=this.magmaActiveRuns[notebookid].context
                                                    .then(()=>this._runMagmaCode(notebookid,code)
                                                                  .then(()=>{ execution.end(true, Date.now());}
                                                                      ));
                                          }                            
                                      }  
                            else {execution.end(false);
                                  let goToSetting  = 'Go to Magma settings';
                                  vscode.window.showErrorMessage('Unable to start the "Magma" interpreter.'+ "\r\n"+'Please revise the corresponding settings.', goToSetting)
                                  .then(selection => {if (selection === goToSetting) {
                                                      vscode.commands.executeCommand( 'workbench.action.openSettings', 'magma' );
                                                        }
                                                      });                                                               
                                  }                
                            }        
  public clean(){this.server.unref(); }                  
  }
