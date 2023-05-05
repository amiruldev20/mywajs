'use strict';
/*
MywaJS
Pengembangan ulang whatsapp-web.js
menggunakan wjs + playwright
contact:
email: amiruldev20@gmail.com
ig: amirul.dev
wa: 62851574894460 
tq to: pedro & edgard & dika
*/
class BaseAuthStrategy {
    constructor() { }
    setup(client) {
        this.client = client;
    }
    async beforeBrowserInitialized() { }
    async afterBrowserInitialized() { }
    async onAuthenticationNeeded() {
        return {
            failed: false,
            restart: false,
            failureEventPayload: undefined
        };
    }
    async getAuthEventPayload() { }
    async afterAuthReady() { }
    async disconnect() { }
    async destroy() { }
    async logout() { }
}

export default BaseAuthStrategy;