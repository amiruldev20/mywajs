'use strict';
/*
© whatsapp-web.js
re-developed by: Amirul Dev
contact:
- ig: @amirul.dev
- github: amiruldev20
- wa: 085157489446
*/
const BaseAuthStrategy = require('./BaseAuth');

/**
 * No session restoring functionality
 * Will need to authenticate via QR code every time
*/
class NoAuth extends BaseAuthStrategy { }


module.exports = NoAuth;