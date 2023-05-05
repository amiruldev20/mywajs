'use strict';
import PrivateContact from '../func/PrivateContact.js';
import BusinessContact from '../func/BusinessContact.js'; 

class ContactFactory {
    static create(client, data) {
        if(data.isBusiness) {
            return new BusinessContact(client, data);
        }

        return new PrivateContact(client, data);
    }
}

export default ContactFactory;