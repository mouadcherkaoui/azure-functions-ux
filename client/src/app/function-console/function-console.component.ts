import { OnDestroy, Component, ViewContainerRef, ViewChild, ComponentRef, ComponentFactory, ComponentFactoryResolver, EventEmitter, Output, ElementRef } from '@angular/core';
import { FunctionAppContextComponent } from '../shared/components/function-app-context-component';
import { FunctionAppService } from '../shared/services/function-app.service';
import { BroadcastService } from '../shared/services/broadcast.service';
import { Subscription } from 'rxjs/Subscription';
import { SiteService } from '../shared/services/site.service';
import { ArmObj } from '../shared/models/arm/arm-obj';
import { Site } from '../shared/models/arm/site';
import { PublishingCredentials } from '../shared/models/publishing-credentials';
import { CacheService } from '../shared/services/cache.service';
import { ArmUtil } from '../shared/Utilities/arm-utils';
import { KeyCodes, ConsoleConstants, Regex, HttpMethods } from '../shared/models/constants';
import { ConsoleService } from '../site/console/shared/services/console.service';
import { Headers } from '@angular/http';
import { PromptComponent } from './extra-components/prompt.component';
import { MessageComponent } from './extra-components/message.component';
import { ErrorComponent } from './extra-components/error.component';

@Component({
    selector: 'console',
    templateUrl: './function-console.component.html',
    styleUrls: ['./function-console.component.scss', '../function-dev/function-dev.component.scss']
})
export class FunctionConsoleComponent extends FunctionAppContextComponent implements OnDestroy {

    public appName: string;
    public isLinux = false;
    public isExpanded = false;
    public command = {'left': '', 'mid': ' ', 'right': '', 'complete': ''};
    public dir: string;
    public isFocused: boolean;
    private _resourceId: string;
    private _functionName: string;
    private _site: ArmObj<Site>;
    private _publishingCredentials: ArmObj<PublishingCredentials>;
    private _lastKeyPressed: number;
    private _enterPressed: boolean;
    private _ptrPosition = 0;
    private _commandHistoryIndex: number;
    private _dirIndex: number;
    private _commandHistory = [''];
    private _listOfDir: string[] = [];
    private _currentPrompt: ComponentRef<any> = null;
    private _lastAPICall: Subscription;
    private _promptComponent: ComponentFactory<any>;
    private _messageComponent: ComponentFactory<any>;
    private _errorComponent: ComponentFactory<any>;
    private _msgComponents: ComponentRef<any>[] = [];
    @ViewChild('prompt', {read: ViewContainerRef})
    private _prompt: ViewContainerRef;
    @ViewChild('consoleBody')
    private _consoleBody: ElementRef;
    @Output() expandClicked = new EventEmitter<boolean>();

    constructor(
        public functionAppService: FunctionAppService,
        public broadcastService: BroadcastService,
        private _siteService: SiteService,
        private _cacheService: CacheService,
        private _consoleService: ConsoleService,
        private _componentFactoryResolver: ComponentFactoryResolver) {
        super('console', functionAppService, broadcastService);
    }

    setup(): Subscription {
        return this.viewInfoEvents
            .subscribe(view => {
                this.isFocused = false;
                this._resourceId = view.siteDescriptor.resourceId;
                this._functionName = view.functionDescriptor.name;
                this.clearConsole();
                this._siteService.getSite(this._resourceId).subscribe(
                    site => {
                        this._site = site.result;
                        this._setConsoleDetails(ArmUtil.isLinuxApp(this._site));
                    });
                this._cacheService.postArm(`${this._resourceId}/config/publishingcredentials/list`).subscribe(
                    publishingcredentials => {
                        this._publishingCredentials = publishingcredentials.json();
                        this.appName = this._publishingCredentials.name;
                    });
            }
        );
    }

    ngOnDestroy() {
        if (this._lastAPICall && !this._lastAPICall.closed) {
            this._lastAPICall.unsubscribe();
        }
    }

    /**
     * Handle key pressed by the user
     * @param event key pressed by the user
     */
    handleKeyPress(event: KeyboardEvent) {
        event.preventDefault();
        if (!this._isKeyEventValid(event.which)) {
            return;
        }
        /**
         * Switch case on the key number
         */
        switch (event.which) {
            case KeyCodes.backspace: {
                this._backspaceKeyEvent();
                break;
            }
            case KeyCodes.tab: {
                this._tabKeyEvent();
                this._renderPromptVariables();
                return;
            }
            case KeyCodes.enter: {
                this._enterKeyEvent();
                break;
            }

            case KeyCodes.escape: {
                this._resetCommand();
                break;
            }

            case KeyCodes.space: {
                this._appendToCommand(ConsoleConstants.whitespace);
                break;
            }

            case KeyCodes.arrowLeft: {
                this._leftArrowKeyEvent();
                break;
            }

            case KeyCodes.arrowUp: {
                this._topArrowKeyEvent();
                break;
            }

            case KeyCodes.arrowRight: {
                this._rightArrowKeyEvent();
                break;
            }

            case KeyCodes.arrowDown: {
                this._downArrowKeyEvent();
                break;
            }

            default: {
                this._appendToCommand(event.key, event.which);
                break;
            }
        }
        this._lastKeyPressed = event.which;
        this._renderPromptVariables();
        this._refreshTabFunctionElements();
    }

    /**
     * Get left side text for the console according to the app type
     */
    getLeftSideText(): string {
        return (this.isLinux ? (this.appName + '@' + this._functionName + ':~$ ') : (this.dir + '> '));
    }

    /**
     * Expand the console interface
     */
    expand() {
        this.isExpanded = true;
        this.expandClicked.emit(true);
    }

    /**
     * Compress the console interface
     */
    compress() {
        this.isExpanded = false;
        this.expandClicked.emit(false);
    }

    /**
     * Clear console on button press
     */
    clearConsole() {
        this._removeMsgComponents();
    }

    focusConsole() {
        this.isFocused = true;
        this._renderPromptVariables();
    }

    /**
     * Remove from focus on using (Ctrl + m)
     */
    private _removeFocus() {
        this._consoleBody.nativeElement.blur();
        this.isFocused = false;
    }

    /**
     * Check if the key pressed by the user is valid
     * @param key key pressed by the user
     */
    private _isKeyEventValid(key: number) {
        if (this._enterPressed && key !== KeyCodes.ctrl && key !== KeyCodes.c) {
            // command already in progress
            return false;
        }
        return true;
    }

    /**
     * Left Arrow key pressed
     */
    private _leftArrowKeyEvent() {
        if (this._ptrPosition >= 1) {
            --this._ptrPosition;
            this._divideCommand();
        }
    }

    /**
     * Right Arrow key pressed
     */
    private _rightArrowKeyEvent() {
        if (this._ptrPosition < this.command.complete.length) {
            ++this._ptrPosition;
            this._divideCommand();
        }
    }

    /**
     * Down Arrow key pressed
     */
    private _downArrowKeyEvent() {
        if (this._commandHistory.length > 0 && this._commandHistoryIndex < this._commandHistory.length - 1) {
            this._commandHistoryIndex = (this._commandHistoryIndex + 1) % (this._commandHistory.length);
            this.command.complete = this._commandHistory[this._commandHistoryIndex];
            this._ptrPosition = this.command.complete.length;
            this._divideCommand();
        }
    }

    /**
     * Top Arrow key pressed
     */
    private _topArrowKeyEvent() {
        if (this._commandHistoryIndex > 0) {
            this.command.complete = this._commandHistory[this._commandHistoryIndex - 1];
            this._commandHistoryIndex = (this._commandHistoryIndex === 1 ? 0 : --this._commandHistoryIndex);
            this._ptrPosition = this.command.complete.length;
            this._divideCommand();
        }
    }

    /**
     * Backspace pressed by the user
     */
    private _backspaceKeyEvent() {
        if (this._ptrPosition < 1) {
            return;
        }
        this.command.left = this.command.left.slice(0, -1);
        if (this._ptrPosition === this.command.complete.length) {
            this.command.complete = this.command.left;
            --this._ptrPosition;
            return;
        }
        this.command.complete = this.command.left + this.command.mid + this.command.right;
        --this._ptrPosition;
        this._divideCommand();
    }

    /**
     * Handle the Enter key pressed operation
     */
    private _enterKeyEvent() {
        this._enterPressed = true;
        const flag = this._performAction();
        this._removePrompt();
        this._commandHistory.push(this.command.complete);
        this._commandHistoryIndex = this._commandHistory.length;
        if (flag) {
            this._addMessageComponent();
            this._connectToKudu();
        } else {
            this._addPromptComponent();
            this._enterPressed = false;
        }
        this._resetCommand();
    }

    /**
     * Remove the current prompt from the console
     */
    private _removePrompt() {
        const oldPrompt = document.getElementById('prompt');
        if (!oldPrompt) {
          return;
        }
        oldPrompt.remove();
    }

    /**
    * Remove all the message history
    */
    private _removeMsgComponents() {
        let len = this._msgComponents.length;
        while (len > 0) {
            --len;
            this._msgComponents.pop().destroy();
        }
    }

    /**
     * Add a message component, this is usually called after user presses enter
     * and we have a response from the Kudu API(might be an error).
     * @param message: String, represents a message to be passed to be shown
     */
    private _addMessageComponent(message?: string) {
        if (!this._messageComponent) {
            this._messageComponent = this._componentFactoryResolver.resolveComponentFactory(MessageComponent);
        }
        const msgComponent = this._prompt.createComponent(this._messageComponent);
        msgComponent.instance.loading = (message ? false : true);
        msgComponent.instance.message = (message ? message : (this.getLeftSideText() + this.command.complete));
        this._msgComponents.push(msgComponent);
    }

    /**
     * Creates a new prompt box,
     * created everytime a command is entered by the user and
     * some response is generated from the server, or 'cls', 'exit'
     */
    private _addPromptComponent() {
        if (!this._promptComponent) {
            this._promptComponent = this._componentFactoryResolver.resolveComponentFactory(PromptComponent);
        }
        this._currentPrompt = this._prompt.createComponent(this._promptComponent);
        this._currentPrompt.instance.dir = this.getLeftSideText();
        this._currentPrompt.instance.isLinux = this.isLinux;
        this._currentPrompt.instance.isFocused = true;
        // hide the loader on the last 2 msg-components
        if (this._msgComponents.length > 0) {   // check required if 'clear' command is entered.
            this._msgComponents[this._msgComponents.length - 1].instance.loading = false;
        }
        if (this._msgComponents.length > 1) {
            this._msgComponents[this._msgComponents.length - 2].instance.loading = false;
        }
        this._enterPressed = false;
    }

    /**
     * Create a error message
     * @param error : String, represents the error message to be shown
     */
    private _addErrorComponent(error: string) {
        if (!this._errorComponent) {
            this._errorComponent = this._componentFactoryResolver.resolveComponentFactory(ErrorComponent);
        }
        const errorComponent = this._prompt.createComponent(this._errorComponent);
        this._msgComponents.push(errorComponent);
        errorComponent.instance.message = error;
    }

    /**
     * Refresh the tab elements,
     * i.e. the list of files/folder and the current dir index
     */
    private _refreshTabFunctionElements() {
        this._listOfDir.length = 0;
        this._dirIndex = -1;
    }

    /**
     * Reset the command
     */
    private _resetCommand() {
        this.command.complete = '';
        this.command.right = '';
        this.command.left = '';
        this.command.mid = ConsoleConstants.whitespace;
        this._ptrPosition = 0;
    }

    /**
     * Force quite a currently running command (Ctrl + C pressed)
     */
    private _forceQuit() {
        if (!this._lastAPICall || this._lastAPICall.closed) {
            this._removePrompt();
            this._addMessageComponent();
        } else if (!this._lastAPICall.closed) {
            this._lastAPICall.unsubscribe();
        }
        this._resetCommand();
        this._addPromptComponent();
    }

    /**
     * Add the text to the current command
     * @param cmd :String
     */
    private _appendToCommand(cmd: string, key?: number) {
        if (key && ((key > KeyCodes.backspace && key <= KeyCodes.delete) || (key >= KeyCodes.leftWindow && key <= KeyCodes.select) || (key >= KeyCodes.f1 && key < KeyCodes.scrollLock))) {
            // key-strokes not allowed, for e.g F1-F12
            return;
        }
        if (key && this._lastKeyPressed === KeyCodes.ctrl) {
            // Ctrl + C or Ctrl + V pressed, should not append c/v to the current command
            if (key === KeyCodes.c) {
                this._forceQuit();
                return;
            }
            if (key === KeyCodes.v) {
                return;
            }
            if (key === KeyCodes.m) {
                this._removeFocus();
                return;
            }
        }
        this._commandHistoryIndex = this._commandHistory.length; // reset the command-index to the last command
        if (this._ptrPosition === this.command.complete.length) {
            this.command.left += cmd;
            this.command.complete = this.command.left;
            ++this._ptrPosition;
            return;
        }
        this.command.left += cmd;
        this.command.complete = this.command.left + this.command.mid + this.command.right;
        ++this._ptrPosition;
    }

    /**
     * Render the dynamically loaded prompt box,
     * i.e. pass in the updated command the inFocus value to the PromptComponent.
     */
    private _renderPromptVariables() {
        if (this._currentPrompt) {
            this._currentPrompt.instance.command = this.command;
            this._currentPrompt.instance.isFocused = this.isFocused;
        }
    }

    /**
     * Divide command into different parts
     */
    private _divideCommand() {
        if (this._ptrPosition < 0 || this._ptrPosition > this.command.complete.length) {
            return;
        }
        if (this._ptrPosition === this.command.complete.length) {
            this.command.left = this.command.complete;
            this.command.mid = ConsoleConstants.whitespace;
            this.command.right = '';
            return;
        }
        this.command.left = this.command.complete.substring(0, this._ptrPosition);
        this.command.mid = this.command.complete.substring(this._ptrPosition, this._ptrPosition + 1);
        this.command.right = this.command.complete.substring(this._ptrPosition + 1, this.command.complete.length);
    }

    /**
     * Create a command based on the app-type
     * @param cmd command entered by the user
     */
    private _createCommand(cmd: string) {
        if (this.isLinux) {
            return `bash -c \' ${cmd} && echo \'\' && pwd\'`;
        }
        return cmd;
    }

    /**
     * Handle the tab-pressed event
     */
    private _tabKeyEvent() {
        if (this._listOfDir.length === 0) {
            const uri = this._getKuduUri();
            const header = this._getHeader();
            const body = {
                'command': this._createCommand(this._getTabKeyCommand()),
                'dir': this.dir
            };
            const res = this._consoleService.send(HttpMethods.POST, uri, JSON.stringify(body), header);
            res.subscribe(
                data => {
                    const output = data.json();
                    if (output.ExitCode === ConsoleConstants.successExitcode) {
                        // fetch the list of files/folders in the current directory
                        const cmd = this.command.complete.substring(0, this._ptrPosition);
                        const allFiles = this.isLinux ? (
                                output.Output.split(ConsoleConstants.newLine.repeat(2) + this.dir)[0].split(ConsoleConstants.newLine)
                            ) : output.Output.split(ConsoleConstants.windowsNewLine);
                        this._listOfDir = this._consoleService.findMatchingStrings(allFiles, cmd.substring(cmd.lastIndexOf(ConsoleConstants.whitespace) + 1));
                        if (this._listOfDir.length > 0) {
                            this._dirIndex = this._listOfDir.length > 1 ? 1 : 0;
                            this.command.complete = this.command.complete.substring(0, this._ptrPosition);
                            this.command.complete = this.command.complete.substring(0, this.command.complete.lastIndexOf(ConsoleConstants.whitespace) + 1) + this._listOfDir[0];
                            this._ptrPosition = this.command.complete.length;
                            this._divideCommand();
                        }
                    }
                },
                err => {
                    console.log('Tab Key Error' + err.text);
                }
            );
            return;
        }
        this.command.complete = this.command.complete.substring(0, this._ptrPosition);
        this.command.complete = this.command.complete.substring(0, this.command.complete.lastIndexOf(ConsoleConstants.whitespace) + 1) + this._listOfDir[ (this._dirIndex++) % this._listOfDir.length];
        this._ptrPosition = this.command.complete.length;
        this._divideCommand();
    }

    /**
     * Connect to the kudu API and display the response;
     * both incase of an error or a valid response
     */
    private _connectToKudu() {
        const uri = this._getKuduUri();
        const header = this._getHeader();
        const cmd = this.command.complete;
        const body = {
            'command': this._createCommand(cmd),
            'dir': this.dir
        };
        const res = this._consoleService.send(HttpMethods.POST, uri, JSON.stringify(body), header);
        this._lastAPICall = res.subscribe(
            data => {
                const output = data.json();
                if (output.Output === '' && output.ExitCode !== ConsoleConstants.successExitcode) {
                    this._addErrorComponent(output.Error + ConsoleConstants.newLine);
                } else {
                    if (output.ExitCode === ConsoleConstants.successExitcode && this._performAction(cmd, output.Output)) {
                        if (output.Output !== '') {
                            const msg = this.isLinux ? (
                                output.Output.split(ConsoleConstants.newLine.repeat(2) + this.dir)[0] + ConsoleConstants.newLine.repeat(2)
                            ) : (output.Output + ConsoleConstants.newLine);
                            this._addMessageComponent(msg);
                        }
                    }
                }
                this._addPromptComponent();
                this._enterPressed = false;
                return output;
            },
            err => {
                this._addErrorComponent(err.text);
                this._enterPressed = false;
            }
        );
    }

    /**
     * Get tab key(i.e get contents of current directory) according to the app-type
     */
    private _getTabKeyCommand() {
        if (this.isLinux) {
            return 'ls -a';
        }
        return 'dir /b /a';
    }

    /**
     * perform action on key pressed.
     */
    private _performAction(cmd?: string, output?: string): boolean {
        if (this.command.complete.toLowerCase() === ConsoleConstants.windowsClear || this.command.complete.toLowerCase() === ConsoleConstants.linuxClear) {
            this._removeMsgComponents();
            return false;
        }
        if (this.command.complete.toLowerCase() === ConsoleConstants.exit) {
            this._removeMsgComponents();
            this._setConsoleDetails(this.isLinux);
            return false;
        }
        if (cmd && cmd.toLowerCase().startsWith(ConsoleConstants.changeDirectory)) {
            cmd = cmd.substring(2).trim().replace(Regex.singleForwardSlash, ConsoleConstants.singleBackslash).replace(Regex.doubleBackslash, ConsoleConstants.singleBackslash);
            this._changeCurrentDirectory(cmd, output);
            return false;
        }
        return true;
    }

    /**
     * Change current directory; run cd command
     */
    private _changeCurrentDirectory(cmd: string, output?: string) {
        if (this.isLinux) {
            output = output.replace(Regex.newLine, '');
            this.dir = output;
            return;
        }
        const currentDirs = this.dir.split(ConsoleConstants.singleForwardSlash);
        currentDirs.pop();
        if (cmd === ConsoleConstants.singleBackslash) {
            this.dir = currentDirs[0];
        } else {
            const dirsInPath = cmd.split(ConsoleConstants.singleBackslash);
            for (let i = 0; i < dirsInPath.length; ++i) {
                if (dirsInPath[i] === ConsoleConstants.currentDirectory) {
                    // remain in current directory
                } else if (dirsInPath[i] === '' || dirsInPath[i] === ConsoleConstants.previousDirectory) {
                    if (currentDirs.length === 1) {
                        break;
                    }
                    currentDirs.pop();
                } else {
                    currentDirs.push(dirsInPath[i]);
                }
            }
            this.dir = currentDirs.join(ConsoleConstants.singleForwardSlash) + ConsoleConstants.singleForwardSlash;
        }
    }

    /**
     * Get API Url according to the app type
     */
    private _getKuduUri() {
        const scmHostName = this._site.properties.hostNameSslStates.find (h => h.hostType === 1).name;
        if (this.isLinux) {
            return `https://${scmHostName}/command`;
        }
        return `https://${scmHostName}/api/command`;
    }

    /**
     * Get headers for the api call
     */
    private _getHeader(): Headers {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');
        headers.append('Authorization', `Basic ` + ((this._publishingCredentials) ? btoa(`${this._publishingCredentials.properties.publishingUserName}:${this._publishingCredentials.properties.publishingPassword}`) : btoa(`admin:kudu`)));
        return headers;
    }

    /**
     * Set console details.
     * @param isLinux boolean which represents whether the app is a linux app.
     */
    private _setConsoleDetails(isLinux: boolean) {
        this.isLinux = isLinux;
        if (isLinux) {
            this.dir = ConsoleConstants.linuxDefaultDir + this._functionName;
            return;
        }
        this.dir = ConsoleConstants.windowsDefaultDir + this._functionName + ConsoleConstants.singleForwardSlash;
    }
}
