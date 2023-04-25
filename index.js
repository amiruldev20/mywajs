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

export { default as Client } from './src/Client.js';

// Structures
export {
    Chat,
    PrivateChat,
    GroupChat,
    Message,
    MessageMedia,
    Contact,
    PrivateContact,
    BusinessContact,
    ClientInfo,
    Location,
    ProductMetadata,
    List,
    Buttons,
    PollVote,
    Call
} from './src/func/index.js';

// Auth Strategies
export { default as NoAuth } from './src/auth/NoAuth.js'
export { default as LocalAuth } from './src/auth/LocalAuth.js'
export { default as RemoteAuth } from './src/auth/RemoteAuth.js'
export { default as LegacySessionAuth } from './src/auth/LegacySessionAuth.js'

export * from './src/util/Constants.js';