'use strict';
/* 
© whatsapp-web.js
re-developed by: Amirul Dev
contact:
- ig: @amirul.dev
- github: amiruldev20
- wa: 085157489446
*/

/**
 * Base class which all authentication strategies extend
 */
class BaseAuthStrategy {
    constructor() {}
    setup(client) {
        this.client = client;
    }
    async beforeBrowserInitialized() {}
    async afterBrowserInitialized() {}
    async onAuthenticationNeeded() {
        return {
            failed: false,
            restart: false,
            failureEventPayload: undefined
        };
    }
    async getAuthEventPayload() {}
    async afterAuthReady() {}
    async disconnect() {}
    async destroy() {}
    async logout() {}
}

module.exports = BaseAuthStrategy;