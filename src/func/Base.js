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
 * Represents a WhatsApp data structure
 */
class Base {
    constructor(client) {
        /**
         * The client that instantiated this
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });
    }

    _clone() {
        return Object.assign(Object.create(this), this);
    }
    
    _patch(data) { return data; }
}

module.exports = Base;