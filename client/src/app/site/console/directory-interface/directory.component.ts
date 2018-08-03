import { Component, OnInit } from '@angular/core';
import { ConsoleService } from '../shared/services/console.service';
import { Site } from '../../../shared/models/arm/site';
import { ArmObj } from '../../../shared/models/arm/arm-obj';
import { PublishingCredentials } from '../../../shared/models/publishing-credentials';
import { Subscription } from 'rxjs/Subscription';
import { HttpMethods } from '../../../shared/models/constants';
import { Headers } from '@angular/http';

@Component({
    selector: 'app-directory',
    templateUrl: './directory.component.html',
    styleUrls: ['./directory.component.scss'],
  })
  export class DirectoryComponent implements OnInit {
      /**
       * Commands:
       *    CMD{
       *        files - dir /b /a-d
       *        folders - dir /a:d /b
       *    }
       */
      public dir: string = 'D:/home/site/wwwroot/';
      public createItemVisible = false;
      public fileContentVisible = false;
      public currentDirItems = [];
      public newItemName = '';
      public newItemType = true;
      public isLoading = true;
      public selectedFile = { 'name': '', 'content': ''};
      private _site: ArmObj<Site>;
      private _publishingCredentials: ArmObj<PublishingCredentials>;
      private _resourceId: string;
      private _resourceIdSubscription: Subscription;
      private _siteSubscription: Subscription;
      private _publishingCredSubscription: Subscription;

      constructor(
          private _consoleService: ConsoleService
        ) {
      }

    ngOnInit() {
        this._resourceIdSubscription = this._consoleService.getResourceId().subscribe(resourceId => {
            this._resourceId = resourceId; });
        this._siteSubscription = this._consoleService.getSite().subscribe(site => {
            this._site = site; });
        this._publishingCredSubscription = this._consoleService.getPublishingCredentials().subscribe(publishingCredentials => {
            this._publishingCredentials = publishingCredentials;
        });
        this._getCurrentDirectoryItems();
    }

    itemClicked(item) {
        if  (item.type === 0) {  // Directory Clicked
            this.dir += item.name + '/';
            this._getCurrentDirectoryItems();
            return;
        }
        this.isLoading = true;
        this.selectedFile.name = item.name;
        this._executeCommand(`cat ${item.name}`);
        this.fileContentVisible = true;
    }

    closeModal() {
        this.createItemVisible = false;
        this.newItemName = '';
    }

    closeFileModal() {
        this.fileContentVisible = false;
        this.selectedFile.name = '';
        this.selectedFile.content = '';
    }

    goBack() {
        const dirs = this.dir.split('/');
        if (dirs.length > 2) {
            dirs.pop();
            dirs[dirs.length - 1] = '';
            this.dir = dirs.join('/');
            this._getCurrentDirectoryItems();
        }
    }

    goToHome() {
        this.dir = 'D:/home/';
        this._getCurrentDirectoryItems();
    }

    deleteItem(item) {
        let cmd = 'DEL /F /S /Q /A "' + item.name + '"';
        if (item.type === 0) {   // Delete a directory
            cmd = 'rmdir /S /Q ' + item.name;
        }
        // Delete a file
        this._executeCommand(cmd);
    }

    createNewItem() {
        this.isLoading = true;
        if (this.newItemType) { // new folder selected
            this._executeCommand('mkdir ' + this.newItemName);
        }else { // new file selected
            this._executeCommand('touch ' + this.newItemName);
        }
        this.newItemName = '';
        this.createItemVisible = false;
    }

    downloadItem(item) {
        let path = '';
        const dirs = this.dir.split('/');
        if (dirs.length === 2) {
            path = 'LocalSiteRoot/';
        }else if (dirs.length > 3) {
            for (let i = 2; i < dirs.length - 1; ++i) {
                path += dirs[i] + '/';
            }
        }
        path += item.name + '/';
        let uri = this._getKuduUri((item.type === 0 ? 'zip' : 'vfs')).substr(8).trim();
        if (!this._publishingCredentials) {
            return;
        }
        uri = `https://${this._publishingCredentials.properties.publishingUserName}:${this._publishingCredentials.properties.publishingPassword}@${uri}${path}`;
        window.open(uri, '_blank');
    }

    private _executeCommand(cmd: string) {
        this.isLoading = true;
        const uri = this._getKuduUri();
        const header = this._getHeader();
        // Get files in the directory
        const body = {
            'command': cmd,
            'dir': (this.dir)
        };
        const res = this._consoleService.send(HttpMethods.POST, uri, JSON.stringify(body), header);
        res.subscribe(
            data => {
                this.isLoading = false;
                this._getCurrentDirectoryItems();
                this.selectedFile.content = data.json().Output;
            },
            err => {
                this.isLoading = false;
                console.log('Error: ' + JSON.stringify(err));
            }
        );
    }

    private _getCurrentDirectoryItems() {
        this.currentDirItems = [];
        const uri = this._getKuduUri();
        const header = this._getHeader();
        // Get files in the directory
        let body = {
            'command': 'dir /b /a-d',
            'dir': (this.dir)
        };
        let res = this._consoleService.send(HttpMethods.POST, uri, JSON.stringify(body), header);
        res.subscribe(
            data => {
                this.isLoading = false;
                const output = data.json();
                // console.log(JSON.stringify(output));
                if (output.Output !== '') {
                    const files = output.Output.split('\r\n');
                    files.pop();
                    for (const file of files) {
                        this.currentDirItems.push({'name': file, 'type': 1});
                    }
                    // this.currentDirItems = this.currentDirItems.concat(files);
                }
            },
            err => {
                this.isLoading = false;
                console.log('Error: ' + JSON.stringify(err));
            }
        );
        this.isLoading = true;
        // Get folders in the directory
        body = {
            'command': 'dir /a:d /b',
            'dir': (this.dir)
        };
        res = this._consoleService.send(HttpMethods.POST, uri, JSON.stringify(body), header);
        res.subscribe(
            data => {
                this.isLoading = false;
                const output = data.json();
                // console.log(JSON.stringify(output));
                if (output.Output !== '') {
                    const files = output.Output.split('\r\n');
                    files.pop();
                    for (const file of files) {
                        this.currentDirItems.push({'name': file, 'type': 0});
                    }
                    // this.currentDirItems = this.currentDirItems.concat(files);
                }
            },
            err => {
                this.isLoading = false;
                console.log('Error: ' + JSON.stringify(err));
            }
        );
    }

    private _getHeader(): Headers {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');
        headers.append('Authorization', `Basic ` + ((this._publishingCredentials) ? btoa(`${this._publishingCredentials.properties.publishingUserName}:${this._publishingCredentials.properties.publishingPassword}`) : btoa(`admin:kudu`)));
        return headers;
    }

    private _getKuduUri(api?: string): string {
        const scmHostName = this._site.properties.hostNameSslStates.find (h => h.hostType === 1).name;
        return `https://${scmHostName}/api/${api ? api : 'command'}/`;
    }
  }
