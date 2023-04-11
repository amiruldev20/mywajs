'use strict';

const PrivateContact = require('../func/PrivateContact');
const BusinessContact = require('../func/BusinessContact');

class ContactFactory {
    static create(client, data) {
        if(data.isBusiness) {
            return new BusinessContact(client, data);
        }

        return new PrivateContact(client, data);
    }
}

module.exports = ContactFactory;