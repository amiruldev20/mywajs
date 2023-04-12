'use strict';
/*
© whatsapp-web.js
re-developed by: Amirul Dev
contact:
- ig: @amirul.dev
- github: amiruldev20
- wa: 085157489446
*/

const Contact = require('./Contact');

/**
 * Represents a Business Contact on WhatsApp
 * @extends {Contact}
 */
class BusinessContact extends Contact {
    _patch(data) {
        /**
         * The contact's business profile
         */
        this.businessProfile = data.businessProfile;

        return super._patch(data);
    }

}

module.exports = BusinessContact;