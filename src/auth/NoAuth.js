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
import BaseAuthStrategy from './BaseAuth.js';
/**
 * No session restoring functionality
 * Will need to authenticate via QR code every time
*/
class NoAuth extends BaseAuthStrategy { }

export default NoAuth;
