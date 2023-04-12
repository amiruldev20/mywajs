'use strict';
/*
© whatsapp-web.js
re-developed by: Amirul Dev
contact:
- ig: @amirul.dev
- github: amiruldev20
- wa: 085157489446
*/

'use strict';

const Constants = require('./src/util/Constants');

module.exports = {
    Client: require('./src/Client'),
    
    version: require('./package.json').version,

    // func
    Chat: require('./src/func/Chat'),
    PrivateChat: require('./src/func/PrivateChat'),
    GroupChat: require('./src/func/GroupChat'),
    Message: require('./src/func/Message'),
    MessageMedia: require('./src/func/MessageMedia'),
    Contact: require('./src/func/Contact'),
    PrivateContact: require('./src/func/PrivateContact'),
    BusinessContact: require('./src/func/BusinessContact'),
    ClientInfo: require('./src/func/ClientInfo'),
    Location: require('./src/func/Location'),
    ProductMetadata: require('./src/func/ProductMetadata'),
    List: require('./src/func/List'),
    Buttons: require('./src/func/Buttons'),
    
    // Auth 
    NoAuth: require('./src/auth/NoAuth'),
    LocalAuth: require('./src/auth/LocalAuth'),
    RemoteAuth: require('./src/auth/RemoteAuth'),
    LegacySessionAuth: require('./src/auth/LegacySessionAuth'),
    
    ...Constants
};