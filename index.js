'use strict';
/*
© whatsapp-web.js
re-developed by: Amirul Dev
contact:
- ig: @amirul.dev
- github: amiruldev20
- wa: 085157489446
*/

const Constants = require('./src/util/Constants');

module.exports = {
    Client: require('./src/Client'),
    ClientInfo: require('./src/func/ClientInfo'),
    version: require('./package.json').version,

    // Function
    Chat: require('./src/func/Chat'),
    Message: require('./src/func/Message'),
    MessageMedia: require('./src/func/MessageMedia'),
    PrivateChat: require('./src/func/PrivateChat'),
    GroupChat: require('./src/func/GroupChat'),
    PrivateContact: require('./src/func/PrivateContact'),
    BusinessContact: require('./src/func/BusinessContact'),
    
    // Auth
    LocalAuth: require('./src/auth/LocalAuth'),

    ...Constants
};