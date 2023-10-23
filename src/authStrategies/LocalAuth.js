'use strict';

const path = require('path');
const fs = require('fs');
const BaseAuthStrategy = require('./BaseAuthStrategy');

/**
 * Local directory-based authentication
 * @param {object} options - options
 * @param {string} options.clientId - Client id to distinguish instances if you are using multiple, otherwise keep null if you are using only one instance
 * @param {string} options.dataPath - Change the default path for saving session files, default is: "./.wwebjs_auth/" 
*/
class LocalAuth extends BaseAuthStrategy {
    constructor({ clientId, dataPath }={}) {
        super();

        const idRegex = /^[-_\w]+$/i;
        if(clientId && !idRegex.test(clientId)) {
            throw new Error('Invalid clientId. Only alphanumeric characters, underscores and hyphens are allowed.');
        }

        this.dataPath = path.resolve(dataPath || './.mywa_auth/');
        this.clientId = clientId;
    }

    async beforeBrowserInitialized() {
        const playwrightOpts = this.client.options.playwright;
        const sessionDirName = this.clientId ? `session-${this.clientId}` : 'session';
        const dirPath = path.join(this.dataPath, sessionDirName);

        if(playwrightOpts.userDataDir && playwrightOpts.userDataDir !== dirPath) {
            throw new Error('LocalAuth is not compatible with a user-supplied userDataDir.');
        }

        fs.mkdirSync(dirPath, { recursive: true });
        
        this.client.options.playwright = {
            ...playwrightOpts,
            userDataDir: dirPath
        };

        this.userDataDir = dirPath;
    }

    async logout() {
        if (this.userDataDir) {
            return (fs.rmSync ? fs.rmSync : fs.rmdirSync).call(this, this.userDataDir, { recursive: true, force: true });
        }
    }

}

module.exports = LocalAuth;
