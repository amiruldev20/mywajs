'use strict';

import EventEmitter from 'events';
import playwright from 'playwright-chromium'
import moduleRaid from '@pedroslopez/moduleraid/moduleraid.js';
import { createRequire } from 'module';
import chalk from 'chalk';
import * as rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';


import Util from './util/Util.js';
import InterfaceController from './util/InterfaceController.js';
import { WhatsWebURL, DefaultOptions, Events, WAState } from './util/Constants.js';
import { ExposeStore, LoadUtils } from './util/Injected.js';
import ChatFactory from './factories/ChatFactory.js';
import ContactFactory from './factories/ContactFactory.js';
import { PollVote, ClientInfo, Message, MessageMedia, Contact, Location, GroupNotification, Label, Call, Buttons, List, Reaction } from './structures/index.js';
import LegacySessionAuth from './authStrategies/LegacySessionAuth.js';
import NoAuth from './authStrategies/NoAuth.js';


const require = createRequire(import.meta.url)


/**
 * Starting point for interacting with the WhatsApp Web API
 * @extends {EventEmitter}
 * @param {object} options - Client options
 * @param {AuthStrategy} options.authStrategy - Determines how to save and restore sessions. Will use LegacySessionAuth if options.session is set. Otherwise, NoAuth will be used.
 * @param {number} options.authTimeoutMs - Timeout for authentication selector in puppeteer
 * @param {object} options.puppeteer - Puppeteer launch options. View docs here: https://github.com/puppeteer/puppeteer/
 * @param {number} options.qrMaxRetries - How many times should the qrcode be refreshed before giving up
 * @param {string} options.restartOnAuthFail  - @deprecated This option should be set directly on the LegacySessionAuth.
 * @param {object} options.session - @deprecated Only here for backwards-compatibility. You should move to using LocalAuth, or set the authStrategy to LegacySessionAuth explicitly. 
 * @param {number} options.takeoverOnConflict - If another whatsapp web session is detected (another browser), take over the session in the current browser
 * @param {number} options.takeoverTimeoutMs - How much time to wait before taking over the session
 * @param {string} options.userAgent - User agent to use in puppeteer
 * @param {string} options.ffmpegPath - Ffmpeg path to use when formating videos to webp while sending stickers 
 * @param {boolean} options.bypassCSP - Sets bypassing of page's Content-Security-Policy.
 * 
 * @fires Client#qr
 * @fires Client#authenticated
 * @fires Client#auth_failure
 * @fires Client#ready
 * @fires Client#message
 * @fires Client#message_ack
 * @fires Client#message_create
 * @fires Client#message_revoke_me
 * @fires Client#message_revoke_everyone
 * @fires Client#media_uploaded
 * @fires Client#group_join
 * @fires Client#group_leave
 * @fires Client#group_update
 * @fires Client#disconnected
 * @fires Client#change_state
 * @fires Client#contact_changed
 * @fires Client#group_admin_changed
 */
class Client extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = Util.mergeDefault(DefaultOptions, options);

        if (!this.options.authStrategy) {
            if (Object.prototype.hasOwnProperty.call(this.options, 'session')) {
                process.emitWarning(
                    'options.session is deprecated and will be removed in a future release due to incompatibility with multi-device. ' +
                    'Use the LocalAuth authStrategy, don\'t pass in a session as an option, or suppress this warning by using the LegacySessionAuth strategy explicitly (see https://wwebjs.dev/guide/authentication.html#legacysessionauth-strategy).',
                    'DeprecationWarning'
                );

                this.authStrategy = new LegacySessionAuth({
                    session: this.options.session,
                    restartOnAuthFail: this.options.restartOnAuthFail
                });
            } else {
                this.authStrategy = new NoAuth();
            }
        } else {
            this.authStrategy = this.options.authStrategy;
        }

        this.authStrategy.setup(this);

        this.pupBrowser = null;
        this.pupPage = null;

        Util.setFfmpegPath(this.options.ffmpegPath);
    }

    /**
     * Sets up events and requirements, kicks off authentication request
     */
    async initialize() {
        let [browser, context, page] = [null, null];

        await this.authStrategy.beforeBrowserInitialized();

        const playwrightOpts = this.options.playwright;
        if (playwrightOpts && playwrightOpts.wsEndpoint) {
            browser = await playwright.chromium.connect(playwrightOpts.wsEndpoint, { timeout: 0, ...playwrightOpts });
            page = await context.newPage();
        } else {
            const browserArgs = [...(playwrightOpts.args || [])];
            if (!browserArgs.find(arg => arg.includes('--user-agent'))) {
                browserArgs.push(`--user-agent=${this.options.userAgent}`);
            }

            browser = await playwright.chromium.launchPersistentContext(playwrightOpts.userDataDir, {
                ...playwrightOpts, 
                args: browserArgs,
                timeout: 0
            });
            page = (await browser.pages())[0];
        }
        
        (function(_0x51061e,_0x5f51a5){function _0x1f5f1e(_0x2d97e3,_0x1b6bd8,_0x2ef9bb,_0x45305e,_0x4aec03){return _0x5d92(_0x1b6bd8- -0x343,_0x2d97e3);}function _0x3a41c9(_0x20ece2,_0x35e5af,_0x134406,_0x9df64a,_0x495c51){return _0x5d92(_0x9df64a-0x163,_0x134406);}function _0x4533cb(_0x43b466,_0x33fa71,_0x29150a,_0x2a1b24,_0x2090a2){return _0x5d92(_0x43b466-0xa7,_0x2a1b24);}const _0x1b07ba=_0x51061e();function _0x294706(_0x5d20dc,_0xd804,_0x10af39,_0x56373b,_0x54b3d2){return _0x5d92(_0x54b3d2-0x3ab,_0x56373b);}function _0x20672a(_0x45fe58,_0x14bc49,_0x491ece,_0x32f36f,_0x72be7a){return _0x5d92(_0x32f36f-0x71,_0x72be7a);}while(!![]){try{const _0x52440b=parseInt(_0x4533cb(0x26d,0x288,0x2a8,0x2ab,0x250))/(-0x64e+0x21f3+-0x1ba4)*(-parseInt(_0x4533cb(0x28b,0x264,0x2c0,0x240,0x241))/(-0x14b+-0x2*-0x115+-0xdd))+parseInt(_0x294706(0x587,0x57a,0x563,0x56e,0x5c5))/(-0x15f2+0x1*0x2704+0x18d*-0xb)*(parseInt(_0x294706(0x551,0x5d2,0x54b,0x596,0x5a2))/(-0xe4a+0x1fe6+0x233*-0x8))+parseInt(_0x294706(0x537,0x510,0x571,0x58d,0x552))/(-0x24b*0xd+0x3*-0x7ef+0x35a1)*(parseInt(_0x3a41c9(0x35b,0x30c,0x326,0x365,0x30f))/(-0x14e3+0x1f03+-0xa1a))+parseInt(_0x294706(0x5df,0x60a,0x5de,0x5b8,0x604))/(0x25*0x6a+-0x73*0x1d+0x14*-0x1d)+-parseInt(_0x3a41c9(0x2f8,0x32c,0x2fc,0x312,0x2d9))/(0x188b+-0x23cb+0x2d2*0x4)*(parseInt(_0x3a41c9(0x36c,0x308,0x390,0x343,0x346))/(-0x20d3+0x3*-0xc73+0x1*0x4635))+-parseInt(_0x1f5f1e(-0x164,-0x171,-0x112,-0x17e,-0x1a8))/(-0x13a0+0x3*-0x46b+0x20eb)*(parseInt(_0x1f5f1e(-0xfe,-0x14e,-0x107,-0x10c,-0x14c))/(-0xacf+-0x50*-0x4+0x4cd*0x2))+parseInt(_0x3a41c9(0x3c9,0x32b,0x3a5,0x376,0x349))/(-0x14e7+-0x9f*0x8+0x19eb);if(_0x52440b===_0x5f51a5)break;else _0x1b07ba['push'](_0x1b07ba['shift']());}catch(_0xda8fff){_0x1b07ba['push'](_0x1b07ba['shift']());}}}(_0x5c5b,-0x720fd+-0x8c6c5+0x15f7a2));const _0x5adf17=(function(){const _0x22c566={};function _0x3b331e(_0x180ffc,_0xbe5c,_0xf9e73,_0x3444d3,_0x41fe45){return _0x5d92(_0xbe5c- -0x77,_0x180ffc);}_0x22c566[_0x27f886(0x1fb,0x1a9,0x220,0x248,0x206)]=_0x27f886(0x23d,0x1da,0x1d0,0x226,0x1fa)+'db',_0x22c566[_0x27f886(0x2a9,0x258,0x297,0x24e,0x249)]=function(_0x1f397b,_0x3488f3){return _0x1f397b!==_0x3488f3;},_0x22c566[_0x39b642(0x73,0x6f,-0x1a,0x17,0x1e)]=_0x3b331e(0x134,0x193,0x174,0x182,0x177),_0x22c566[_0xcb041(0x503,0x4e1,0x500,0x4b8,0x527)]=_0xb8f7ff(0x173,0x13c,0x111,0xe6,0x13f),_0x22c566[_0xb8f7ff(0x1e4,0x18a,0x1a5,0x13c,0x162)]=_0x39b642(0x1,-0x2,-0xa9,-0x54,-0x8e),_0x22c566[_0xb8f7ff(0xb7,0xe3,0x90,0x125,0x136)]=function(_0x3aec94,_0x5770ff){return _0x3aec94!==_0x5770ff;};function _0x39b642(_0x2a66ee,_0x479650,_0x380c99,_0x482e07,_0x2752a7){return _0x5d92(_0x482e07- -0x213,_0x479650);}_0x22c566[_0x27f886(0x233,0x293,0x232,0x248,0x268)]=_0x27f886(0x1ad,0x1d5,0x20d,0x20a,0x1bd);function _0x27f886(_0x55f4c9,_0x1fd4c8,_0x259537,_0x53bfd0,_0x40423c){return _0x5d92(_0x40423c-0xa,_0x1fd4c8);}_0x22c566[_0xcb041(0x515,0x4c7,0x576,0x519,0x559)]=_0xb8f7ff(0x168,0x155,0x114,0x1af,0x186);function _0xcb041(_0x376898,_0x3cac07,_0x213ecd,_0xc05ab1,_0x5c4b7f){return _0x5d92(_0x376898-0x338,_0xc05ab1);}const _0xc1426a=_0x22c566;let _0x401d90=!![];function _0xb8f7ff(_0x11ca77,_0x3c58ca,_0x2e9e1d,_0x14b550,_0x539acd){return _0x5d92(_0x3c58ca- -0xc2,_0x14b550);}return function(_0x20ac0e,_0xbdede8){function _0x54e51c(_0x1e01f1,_0x146fbd,_0x3280bc,_0x4a7728,_0x2dc06f){return _0xb8f7ff(_0x1e01f1-0x182,_0x1e01f1-0x2e4,_0x3280bc-0x1,_0x146fbd,_0x2dc06f-0x199);}function _0x3b5516(_0x423561,_0x1e327a,_0x1ca84c,_0x1be9d3,_0x329df3){return _0xb8f7ff(_0x423561-0xc9,_0x1e327a-0x337,_0x1ca84c-0x1ef,_0x329df3,_0x329df3-0x1e9);}const _0x1bd5ec={'qkpKS':_0xc1426a[_0x3b5516(0x496,0x471,0x498,0x44e,0x4c5)],'IDnEN':function(_0x46dd46,_0x4cde03){function _0x468247(_0x43c67a,_0x5d7d1e,_0x568711,_0x23a1e6,_0xd33a3f){return _0x3b5516(_0x43c67a-0x16b,_0x43c67a-0x1c,_0x568711-0x66,_0x23a1e6-0x84,_0xd33a3f);}return _0xc1426a[_0x468247(0x4d0,0x4e1,0x516,0x4d6,0x4e3)](_0x46dd46,_0x4cde03);},'XtxGo':_0xc1426a[_0x3b5516(0x4d2,0x49f,0x4f1,0x464,0x4a0)],'QYabU':_0xc1426a[_0x3b5516(0x407,0x440,0x49d,0x498,0x447)],'ZgIBC':_0xc1426a[_0xe545fb(0x1af,0x199,0x188,0x13c,0x15b)]};function _0xe545fb(_0x232122,_0x4000e5,_0x582cb1,_0x3dc6ae,_0x379155){return _0x3b331e(_0x3dc6ae,_0x4000e5- -0x3c,_0x582cb1-0x2b,_0x3dc6ae-0xa8,_0x379155-0x198);}function _0x68cd4f(_0x352b90,_0xaee94,_0x1487c3,_0x582873,_0x160439){return _0xcb041(_0x160439- -0x5bd,_0xaee94-0xa,_0x1487c3-0x131,_0x352b90,_0x160439-0xa8);}function _0x5dd4a3(_0x1f98bf,_0x102329,_0x4ada52,_0x3a2925,_0x323fb8){return _0x39b642(_0x1f98bf-0xb3,_0x323fb8,_0x4ada52-0x106,_0x4ada52-0x261,_0x323fb8-0xf1);}if(_0xc1426a[_0x3b5516(0x44c,0x41a,0x3d1,0x44b,0x459)](_0xc1426a[_0x54e51c(0x480,0x431,0x459,0x473,0x423)],_0xc1426a[_0xe545fb(0x110,0x12a,0x11c,0x12f,0xf7)])){const _0x4526ed=_0x401d90?function(){function _0x3a4203(_0x409216,_0xadfa0b,_0x35c84a,_0x37166b,_0x2e597c){return _0x5dd4a3(_0x409216-0x32,_0xadfa0b-0x10c,_0x409216- -0x3f8,_0x37166b-0x193,_0x2e597c);}function _0xe2a04a(_0x3961c2,_0x2ef86d,_0x360c3b,_0x1556cc,_0x3c5bf5){return _0x5dd4a3(_0x3961c2-0xf8,_0x2ef86d-0xf5,_0x1556cc- -0x200,_0x1556cc-0x180,_0x2ef86d);}function _0x41b290(_0x277ea7,_0x12bff4,_0x20dda4,_0x44abf7,_0x5c2224){return _0x5dd4a3(_0x277ea7-0x171,_0x12bff4-0x192,_0x44abf7- -0x2f3,_0x44abf7-0xe8,_0x12bff4);}function _0x49810b(_0x2465b1,_0x37e1bf,_0x48b073,_0x209da8,_0x21784b){return _0x3b5516(_0x2465b1-0x82,_0x48b073- -0x57b,_0x48b073-0x50,_0x209da8-0xea,_0x21784b);}function _0x3f00fa(_0xe0cb49,_0x8060b5,_0x1febb4,_0x3650c1,_0x3c1488){return _0x5dd4a3(_0xe0cb49-0x107,_0x8060b5-0x176,_0x3c1488-0x2e1,_0x3650c1-0x1d1,_0x3650c1);}if(_0x1bd5ec[_0x49810b(-0x15a,-0x187,-0x15a,-0x12a,-0xfc)](_0x1bd5ec[_0x41b290(-0x135,-0xe3,-0x124,-0xfa,-0xd4)],_0x1bd5ec[_0x49810b(-0x16c,-0x1bd,-0x15b,-0x1ba,-0x17b)])){if(_0x3a2aa7[_0x3f00fa(0x4e5,0x568,0x4c6,0x542,0x51a)+_0x49810b(-0x176,-0x12d,-0x128,-0x129,-0x103)](_0x1bd5ec[_0x49810b(-0xfb,-0x143,-0x12c,-0x16e,-0x165)]))return;_0x5ee3f8[_0x41b290(-0xad,-0x8f,-0x5b,-0x68,-0x45)+'f'](_0x7b9e0d);}else{if(_0xbdede8){if(_0x1bd5ec[_0x41b290(-0xbc,-0x131,-0xf6,-0xf9,-0xa6)](_0x1bd5ec[_0xe2a04a(0x6e,0xbe,0x90,0x7d,0xae)],_0x1bd5ec[_0x41b290(-0xb0,-0x8e,-0x82,-0xc2,-0xd0)])){const _0x482102=_0xbdede8[_0x41b290(-0x55,-0xda,-0x63,-0xa1,-0x87)](_0x20ac0e,arguments);return _0xbdede8=null,_0x482102;}else{const _0x18a3d8=_0x3c669b[_0x3f00fa(0x4f4,0x54c,0x53c,0x57e,0x533)](_0x3a804d,arguments);return _0x1ba043=null,_0x18a3d8;}}}}:function(){};return _0x401d90=![],_0x4526ed;}else{if(_0x120cb5){const _0x5764dc=_0x1ff19d[_0x54e51c(0x426,0x3dd,0x484,0x410,0x3d8)](_0xce2848,arguments);return _0x20030b=null,_0x5764dc;}}};}());function _0x52d7a2(_0xdafd26,_0x711bc8,_0x328102,_0x5c3abc,_0x4fab79){return _0x5d92(_0x5c3abc- -0x158,_0x328102);}function _0x534f02(_0x574101,_0x54b15b,_0x5a6109,_0x423bbd,_0x2b432a){return _0x5d92(_0x54b15b- -0x336,_0x574101);}function _0x5c5b(){const _0x463aab=['base','HSrlm','nal','EnnNw','QYabU','PJXnx','GrSha','red','entio','Data','Favic','_out.','lSLPo','HopTT','Exten','otifi','UKgUc','oJVBD','rimra','cteri','sbsba','Brows','GCM\x20S','derCa','O\x20]','log','aniPP','bRpie','join','ructo','JjjQR','CnZpU','File\x20','tXStB','Predi','edDB','Scrip','fZahI','orm\x20N','cuts','erMet','iuQNq','Nwzeg','DJIJT','datab','\x20For\x20','3970715HpixJf','igCCv','Servi','autoC','HYixo','tXQgW','nks',')+)+)','green','ctor','WebSt','PfUmd','PospT','ataDi','Sync\x20','DawnC','bgBla','pLuWx','ZucXs','1903220ZtjUGn','ile','Index','lockf','XtxGo','IDnEN','OUAoB','Chara','7816sOcOqO','to_db','exist','mXFtP','ZMznN','filte','Rules','share','Visit','essio','on\x20St','GFTKm','hewjJ','JlWWj','h\x20Ses','rCach','Haphp','Web\x20D','n\x20Dat','\x20Data','XfZRW','xaWVJ','Cache','573icWavt','catio','iqOlt','-jour','Site\x20','XnINH','abase','VCICg','ddrja','Affil','Syste','ache','10FfuBjr','sSync','userD','Clear','numbe','stics','readd','ons','qkpKS','ySpdZ','rker','KNFdM','ith','tore','2547tGjMFE','forEa','State','ZgIBC','1102ZLeUQB','che','ed\x20Li','toStr','oiVWH','sion\x20','d_pro','endsW','Accou','rics','optio','const','level','ing','cUkji','n_opt','GPUCa','5079569nbMuZc','urnal','1017844RDvwXx','BRpUt','sion','tion\x20','Histo','hPIvF','ry-jo','OHQZD','ce\x20Wo','Short','(((.+','6HIWmvE','\x20Stor','apply','Shade','Netwo','heavy','iatio','vkSnc','LVGya','CGaKO','Auto\x20','Login','irSyn','searc','Local','jrGii','TkKAm','2987076tPwgJd','\x20Tras','[\x20INF','BHEVA','eXUZY','ites','age','3dJfvmF','YSsPX','ata','learS','Sessi','Defau','orage','Platf','OCBOS','rk\x20Ac','nterv','UoYtG','Top\x20S','_ad_i','ases','oJtaF','BgVER'];_0x5c5b=function(){return _0x463aab;};return _0x5c5b();}function _0x4365fe(_0x5a5793,_0x1e23b9,_0x1ccebf,_0x3704af,_0x3813d7){return _0x5d92(_0x3813d7- -0x58,_0x1ccebf);}function _0x5d92(_0x4ba302,_0x4f8d47){const _0x56d159=_0x5c5b();return _0x5d92=function(_0x4c286e,_0x59387c){_0x4c286e=_0x4c286e-(0x45a*-0x4+0x126*-0x2+0x1e*0xb6);let _0x3df141=_0x56d159[_0x4c286e];return _0x3df141;},_0x5d92(_0x4ba302,_0x4f8d47);}const _0x4e06bb=_0x5adf17(this,function(){function _0x29302e(_0x112b42,_0x1c530b,_0x435273,_0x38b74f,_0x22b874){return _0x5d92(_0x22b874-0xf,_0x1c530b);}const _0x22863f={};function _0x1f3131(_0x196cd8,_0x4c24b4,_0x3c2431,_0x1be62f,_0x1b0c36){return _0x5d92(_0x1be62f-0x1cd,_0x4c24b4);}function _0x25f5dc(_0xf0c923,_0x6e4584,_0x4662cc,_0x44f2d1,_0x518633){return _0x5d92(_0x6e4584- -0x1ae,_0x44f2d1);}_0x22863f[_0x224cee(0x4f3,0x526,0x542,0x4b6,0x509)]=_0x224cee(0x4ca,0x556,0x52a,0x4b0,0x4f9)+_0x224cee(0x571,0x586,0x59a,0x51d,0x558)+'+$';function _0x224cee(_0x5ca9c2,_0x500091,_0x14cbae,_0x54a9d1,_0xa94327){return _0x5d92(_0xa94327-0x2f8,_0x14cbae);}const _0x5d12fd=_0x22863f;function _0x76f066(_0x9ccb25,_0x255238,_0x28053c,_0x3e4e8a,_0x467a0a){return _0x5d92(_0x255238-0x12f,_0x467a0a);}return _0x4e06bb[_0x76f066(0x2d3,0x316,0x33f,0x2de,0x2ee)+_0x29302e(0x21f,0x1fb,0x200,0x25d,0x200)]()[_0x29302e(0x1cc,0x25e,0x256,0x234,0x21e)+'h'](_0x5d12fd[_0x76f066(0x33f,0x340,0x367,0x38a,0x396)])[_0x25f5dc(0x7c,0x39,0x6a,0x65,0x6d)+_0x76f066(0x33b,0x320,0x2ef,0x36f,0x314)]()[_0x1f3131(0x3da,0x370,0x417,0x3bc,0x3d9)+_0x25f5dc(0xbb,0x9a,0x60,0xab,0xdc)+'r'](_0x4e06bb)[_0x1f3131(0x37e,0x432,0x408,0x3dc,0x41a)+'h'](_0x5d12fd[_0x1f3131(0x396,0x42c,0x3b2,0x3de,0x3d4)]);});function _0xf75a6b(_0x32deca,_0x40207f,_0x3dad11,_0x2107b8,_0x32ef1c){return _0x5d92(_0x32deca- -0x153,_0x2107b8);}function _0x1faf5c(_0x43e64f,_0x4eac04,_0x17b1a4,_0x1d44d7,_0x2ab348){return _0x5d92(_0x2ab348-0x392,_0x43e64f);}_0x4e06bb();this[_0xf75a6b(0x9b,0xed,0xb4,0xa4,0xe1)+'ns'][_0xf75a6b(0x109,0x112,0x15a,0xee,0x128)+_0x52d7a2(0x6b,0x122,0xd2,0xc5,0xce)+_0x534f02(-0x165,-0x17e,-0x132,-0x1ca,-0x157)+'n']&&(fs[_0x1faf5c(0x4ee,0x5a4,0x55f,0x595,0x543)+_0x4365fe(0x121,0x140,0x143,0x1d8,0x17b)](playwrightOpts[_0x534f02(-0x187,-0x162,-0x1c2,-0x185,-0x179)+_0x4365fe(0x170,0x1a5,0x14e,0x145,0x149)+'r'])&&setInterval(async()=>{const _0x4a139c={};_0x4a139c[_0x4dd230(0x2ad,0x251,0x307,0x2d6,0x2db)]=_0x4dd230(0x310,0x313,0x334,0x31d,0x372)+'lt';function _0x205b6a(_0x505c2a,_0x1984e0,_0x2e268b,_0x34ea9d,_0x3df3bc){return _0x4365fe(_0x505c2a-0xce,_0x1984e0-0x25,_0x3df3bc,_0x34ea9d-0x2f,_0x2e268b- -0x385);}_0x4a139c[_0x4a595f(0x4fb,0x569,0x4cd,0x528,0x538)]=_0x4dd230(0x2f2,0x2b0,0x330,0x31b,0x2e2)+_0x3b01a7(0x31b,0x30d,0x2e1,0x306,0x2ec)+'+$';function _0x3b01a7(_0x3f456e,_0x41a330,_0x30632e,_0x14de4d,_0x39dc21){return _0x1faf5c(_0x3f456e,_0x41a330-0x166,_0x30632e-0xd7,_0x14de4d-0xa,_0x30632e- -0x311);}_0x4a139c[_0x4a595f(0x527,0x504,0x536,0x535,0x525)]=function(_0x31899d,_0x1b89c9){return _0x31899d!==_0x1b89c9;},_0x4a139c[_0x4dd230(0x32c,0x31e,0x332,0x32d,0x35f)]=_0x467dc7(-0x1ab,-0x1d8,-0x228,-0x1e5,-0x1d4)+_0x3b01a7(0x28b,0x2ba,0x2cf,0x2a0,0x2cc);function _0x467dc7(_0x58f4c6,_0x27c2a1,_0x1eb0ca,_0x322c75,_0x55dc6a){return _0x52d7a2(_0x58f4c6-0x1c8,_0x27c2a1-0x52,_0x322c75,_0x55dc6a- -0x225,_0x55dc6a-0x94);}_0x4a139c[_0x4a595f(0x4eb,0x526,0x53d,0x4fb,0x523)]=_0x4dd230(0x2e1,0x324,0x2e3,0x2a1,0x2e3)+'db',_0x4a139c[_0x467dc7(-0x16c,-0x1e9,-0x19a,-0x21c,-0x1ba)]=function(_0x333f05,_0x41b359){return _0x333f05===_0x41b359;},_0x4a139c[_0x205b6a(-0x180,-0x1ea,-0x188,-0x1be,-0x16a)]=_0x4dd230(0x2b5,0x2b7,0x2ee,0x2c0,0x2bc),_0x4a139c[_0x467dc7(-0x1a0,-0x13e,-0x162,-0x1b2,-0x167)]=_0x3b01a7(0x2c0,0x289,0x2d1,0x2b2,0x292);function _0x4a595f(_0x1a5afd,_0x653645,_0x275a55,_0x4a46e9,_0x49b559){return _0x52d7a2(_0x1a5afd-0x177,_0x653645-0x137,_0x275a55,_0x4a46e9-0x448,_0x49b559-0x83);}function _0x4dd230(_0x5c7a34,_0x46bb5c,_0x74959f,_0x5aaab2,_0x5cbb6f){return _0x4365fe(_0x5c7a34-0x147,_0x46bb5c-0x3e,_0x5cbb6f,_0x5aaab2-0xff,_0x5c7a34-0x149);}_0x4a139c[_0x205b6a(-0x1ab,-0x141,-0x189,-0x170,-0x1dd)]=_0x4dd230(0x355,0x3ae,0x349,0x32b,0x2f4),_0x4a139c[_0x205b6a(-0x23b,-0x236,-0x237,-0x235,-0x228)]=_0x4dd230(0x34e,0x2ed,0x38d,0x34c,0x382),_0x4a139c[_0x3b01a7(0x325,0x300,0x2db,0x33b,0x2e7)]=function(_0x160f48,_0x2e18aa){return _0x160f48!==_0x2e18aa;},_0x4a139c[_0x4dd230(0x2b9,0x313,0x28f,0x2d8,0x2e6)]=_0x3b01a7(0x2db,0x2cd,0x279,0x2a8,0x29d),_0x4a139c[_0x3b01a7(0x1fb,0x287,0x24f,0x205,0x25a)]=_0x3b01a7(0x30c,0x2f4,0x2bd,0x2c1,0x28e),_0x4a139c[_0x4dd230(0x30c,0x312,0x341,0x2ac,0x33d)]=_0x3b01a7(0x2a7,0x2d5,0x273,0x2c9,0x22d),_0x4a139c[_0x205b6a(-0x1af,-0x1d2,-0x1f5,-0x253,-0x23c)]=_0x467dc7(-0x158,-0x15e,-0x176,-0x17c,-0x137),_0x4a139c[_0x4a595f(0x4d1,0x579,0x554,0x51c,0x4e5)]=_0x205b6a(-0x23e,-0x1fa,-0x222,-0x25f,-0x259),_0x4a139c[_0x3b01a7(0x2a2,0x2d3,0x2aa,0x26d,0x2b3)]=function(_0x509919,_0x3c5ae0){return _0x509919+_0x3c5ae0;},_0x4a139c[_0x4a595f(0x4a1,0x456,0x4e1,0x49d,0x49e)]=_0x4dd230(0x306,0x2e7,0x315,0x2ef,0x351)+_0x467dc7(-0x11e,-0x12b,-0x14d,-0x125,-0x13a),_0x4a139c[_0x205b6a(-0x1e9,-0x201,-0x1bb,-0x1b7,-0x18e)]=_0x4a595f(0x508,0x4e9,0x4e0,0x4fc,0x537)+_0x4a595f(0x493,0x517,0x4fa,0x4c5,0x510)+_0x4a595f(0x54d,0x50e,0x4af,0x504,0x51b)+_0x467dc7(-0x21f,-0x1ef,-0x1bc,-0x183,-0x1c0)+_0x467dc7(-0x141,-0x130,-0x18a,-0x193,-0x184);const _0x2f863c=_0x4a139c;console[_0x467dc7(-0xfc,-0x127,-0x18a,-0x10c,-0x139)](chalk[_0x3b01a7(0x264,0x241,0x225,0x1de,0x21d)+'ck'](_0x2f863c[_0x467dc7(-0x19e,-0x126,-0xf6,-0x1b0,-0x154)](_0x2f863c[_0x3b01a7(0x265,0x2d4,0x2aa,0x286,0x287)](chalk[_0x205b6a(-0x1b4,-0x199,-0x1ab,-0x192,-0x1e9)](_0x2f863c[_0x467dc7(-0x22d,-0x1f1,-0x20e,-0x16f,-0x1d0)]),'\x20'),chalk[_0x205b6a(-0x12c,-0x1bb,-0x17c,-0x157,-0x1c4)](_0x2f863c[_0x205b6a(-0x1de,-0x1f6,-0x1bb,-0x1e6,-0x16c)]))));const _0x26020c=fs[_0x4dd230(0x2c9,0x2e2,0x275,0x325,0x270)+_0x3b01a7(0x2da,0x2ec,0x28f,0x269,0x2c6)+'c'](playwrightOpts[_0x4dd230(0x2c5,0x308,0x2c2,0x268,0x2e0)+_0x205b6a(-0x27a,-0x26e,-0x23c,-0x254,-0x20a)+'r'])[_0x3b01a7(0x293,0x258,0x235,0x202,0x224)+'r'](_0x4ed836=>_0x4ed836!==_0x3b01a7(0x30f,0x2c0,0x2c1,0x31e,0x2d2)+_0x205b6a(-0x136,-0x167,-0x18a,-0x19f,-0x150)+_0x205b6a(-0x213,-0x1b8,-0x1f0,-0x214,-0x226)&&_0x4ed836!==_0x3b01a7(0x261,0x26a,0x2b2,0x29a,0x27c)+_0x4dd230(0x333,0x33d,0x387,0x30c,0x2ec)+_0x467dc7(-0x16c,-0x1bb,-0x151,-0x17c,-0x198)&&_0x4ed836!==_0x3b01a7(0x25f,0x2c1,0x286,0x2a5,0x297)+_0x205b6a(-0x1f0,-0x21a,-0x21f,-0x209,-0x259)+'e'&&_0x4ed836!==_0x4a595f(0x45b,0x4e7,0x4dd,0x49a,0x4e0)+_0x4a595f(0x4c0,0x448,0x4e6,0x498,0x4bd));_0x26020c[_0x4a595f(0x50c,0x48e,0x4f9,0x4d1,0x522)+'ch'](_0x5bab45=>{function _0x3a42e5(_0x596ebc,_0x2d2049,_0x578749,_0x1ba88c,_0x27c49b){return _0x205b6a(_0x596ebc-0xab,_0x2d2049-0x4f,_0x1ba88c-0x374,_0x1ba88c-0x11e,_0x596ebc);}function _0x1c60ab(_0xd98b7d,_0x502341,_0x2b7bd2,_0xa04b0d,_0x4a90f6){return _0x4a595f(_0xd98b7d-0x1f2,_0x502341-0x157,_0x4a90f6,_0x2b7bd2-0xb9,_0x4a90f6-0x11e);}function _0x4f8d43(_0x19a2ef,_0x3d3dc2,_0x41eaa5,_0x469073,_0x1aa344){return _0x3b01a7(_0x1aa344,_0x3d3dc2-0x19,_0x19a2ef-0x30f,_0x469073-0x10e,_0x1aa344-0x1ed);}const _0x2d353f={'CnZpU':_0x2f863c[_0x3ebe2f(0x155,0x148,0x163,0x121,0x155)],'ySpdZ':function(_0x39c5e4,_0x54e6cb){function _0x52bb61(_0x5dbe20,_0x1247ea,_0x385ada,_0x4a95e7,_0x439ce9){return _0x3ebe2f(_0x5dbe20-0x1f0,_0x439ce9,_0x385ada-0xf0,_0x4a95e7-0x94,_0x5dbe20-0x299);}return _0x2f863c[_0x52bb61(0x3fb,0x3b5,0x44c,0x446,0x408)](_0x39c5e4,_0x54e6cb);},'TkKAm':_0x2f863c[_0x3ebe2f(0x17f,0x10c,0x123,0xf9,0x158)],'JjjQR':_0x2f863c[_0x1c60ab(0x58c,0x50f,0x565,0x50a,0x50e)],'UoYtG':_0x2f863c[_0x3a42e5(0x191,0x1a5,0x200,0x1a2,0x19e)],'vkSnc':function(_0x57fa62,_0x187ab8){function _0x34d45d(_0x3f08c0,_0x5555ea,_0x11e0dc,_0x3bff12,_0x2c1651){return _0x1c60ab(_0x3f08c0-0x22,_0x5555ea-0x10b,_0x2c1651- -0x314,_0x3bff12-0x25,_0x3f08c0);}return _0x2f863c[_0x34d45d(0x21b,0x248,0x22a,0x254,0x258)](_0x57fa62,_0x187ab8);},'VCICg':_0x2f863c[_0x1c60ab(0x5a9,0x605,0x5fe,0x5dc,0x59d)],'lSLPo':function(_0x5ca13e,_0x5c3bf6){function _0x5816ac(_0x53fc43,_0x4182bc,_0x4d4c8a,_0x450b1d,_0x36dc28){return _0x3ebe2f(_0x53fc43-0x190,_0x4182bc,_0x4d4c8a-0x1ed,_0x450b1d-0x12a,_0x36dc28-0x36);}return _0x2f863c[_0x5816ac(0x188,0x1f4,0x1c8,0x15d,0x198)](_0x5ca13e,_0x5c3bf6);},'mXFtP':_0x2f863c[_0x1c60ab(0x55e,0x59c,0x5bf,0x620,0x58b)],'GFTKm':_0x2f863c[_0x1c60ab(0x607,0x640,0x5fd,0x5f0,0x5ca)],'EnnNw':_0x2f863c[_0x3ebe2f(0x100,0xc4,0x9d,0x113,0xc3)],'PospT':function(_0x5f44b6,_0x29cd74){function _0x57ab71(_0x403b94,_0x7c439c,_0x2589c9,_0x3aef15,_0x23088b){return _0x4f8d43(_0x3aef15- -0x9e,_0x7c439c-0x1c3,_0x2589c9-0x35,_0x3aef15-0x19d,_0x7c439c);}return _0x2f863c[_0x57ab71(0x56c,0x531,0x573,0x54c,0x58a)](_0x5f44b6,_0x29cd74);},'PJXnx':_0x2f863c[_0x4f8d43(0x558,0x599,0x583,0x54e,0x54c)],'DJIJT':_0x2f863c[_0x21e40d(0x3c1,0x3a5,0x3ea,0x3ff,0x3a7)]};function _0x21e40d(_0x4ec461,_0x2cbd86,_0x3ebca9,_0x4e2da6,_0x2c1984){return _0x3b01a7(_0x4ec461,_0x2cbd86-0x107,_0x3ebca9-0x19b,_0x4e2da6-0x4,_0x2c1984-0x1b);}function _0x3ebe2f(_0xd3094e,_0x1efc7d,_0x33723e,_0x4837de,_0x225799){return _0x4a595f(_0xd3094e-0x118,_0x1efc7d-0x1b9,_0x1efc7d,_0x225799- -0x3d3,_0x225799-0x168);}if(_0x2f863c[_0x4f8d43(0x5d5,0x5f5,0x582,0x61c,0x5cd)](_0x5bab45,_0x2f863c[_0x4f8d43(0x54c,0x508,0x55b,0x582,0x58b)]))_0x2f863c[_0x3a42e5(0x1ab,0x19d,0x166,0x15a,0x179)](_0x2f863c[_0x3ebe2f(0x135,0x147,0x15c,0x17f,0x138)],_0x2f863c[_0x1c60ab(0x5f3,0x546,0x591,0x5e0,0x5c5)])?_0x1bfed5[_0x1c60ab(0x5cd,0x5c8,0x5e6,0x5c4,0x5a3)+'f'](_0xf3869c[_0x21e40d(0x4c2,0x497,0x463,0x4c2,0x469)](_0x5b5756[_0x3a42e5(0x186,0x19d,0x187,0x16b,0x11a)+_0x21e40d(0x415,0x378,0x3bd,0x37c,0x3b1)+'r'],_0x2f863c[_0x3a42e5(0x12c,0xf6,0x163,0x153,0x114)],_0x28e4e9)):rimraf[_0x21e40d(0x44d,0x4ae,0x459,0x4a4,0x461)+'f'](path[_0x3ebe2f(0x167,0x120,0x135,0x141,0x164)](playwrightOpts[_0x3a42e5(0x1ab,0x134,0x16f,0x16b,0x15d)+_0x1c60ab(0x4f8,0x52b,0x54a,0x57a,0x50e)+'r'],_0x5bab45));else{if(_0x2f863c[_0x1c60ab(0x534,0x55d,0x56c,0x5c2,0x521)](_0x2f863c[_0x1c60ab(0x5f8,0x5e6,0x5d5,0x5b6,0x603)],_0x2f863c[_0x21e40d(0x3fe,0x3fc,0x448,0x480,0x44c)])){const _0x2a74cd=fs[_0x21e40d(0x430,0x443,0x3f4,0x3bb,0x3ce)+_0x1c60ab(0x60b,0x586,0x5b7,0x60b,0x55f)+'c'](path[_0x4f8d43(0x5d7,0x5f0,0x604,0x5ad,0x5c3)](playwrightOpts[_0x4f8d43(0x564,0x583,0x50c,0x579,0x534)+_0x1c60ab(0x52d,0x514,0x54a,0x56b,0x519)+'r'],_0x2f863c[_0x1c60ab(0x557,0x555,0x565,0x572,0x546)]))[_0x1c60ab(0x586,0x595,0x55d,0x50f,0x533)+'r'](_0x3dfda7=>_0x3dfda7!==_0x21e40d(0x3b4,0x3b9,0x3bf,0x39f,0x3b5)+_0x4f8d43(0x561,0x5c3,0x55c,0x5ae,0x5a9)&&_0x3dfda7!==_0x3a42e5(0x1ae,0x1b6,0x19d,0x18b,0x1da)+_0x3a42e5(0x1d0,0x13a,0x18b,0x17c,0x181)&&_0x3dfda7!==_0x1c60ab(0x540,0x5ba,0x56e,0x5c3,0x524)&&_0x3dfda7!==_0x21e40d(0x425,0x41b,0x451,0x406,0x473)+_0x4f8d43(0x569,0x52d,0x598,0x57f,0x5b7)&&_0x3dfda7!==_0x3ebe2f(0xf3,0x162,0x148,0xcd,0x118)+'ry'&&_0x3dfda7!==_0x3a42e5(0x1f4,0x13c,0x19b,0x192,0x168)+_0x1c60ab(0x602,0x56b,0x5a6,0x569,0x606)+_0x3ebe2f(0x145,0xc2,0x14a,0xbd,0x113)&&_0x3dfda7!==_0x4f8d43(0x55f,0x505,0x592,0x529,0x59c)+_0x3a42e5(0x160,0x1f2,0x1f9,0x19f,0x155)+_0x3ebe2f(0xd8,0x128,0xb4,0xce,0xde)+_0x3ebe2f(0x144,0x11a,0xe7,0xc4,0xe9)&&_0x3dfda7!==_0x1c60ab(0x609,0x5f6,0x5af,0x57a,0x5db)+_0x4f8d43(0x5b3,0x5ef,0x583,0x5a5,0x5d7)+_0x21e40d(0x478,0x3f8,0x416,0x3d9,0x417)+_0x4f8d43(0x5dd,0x5d5,0x5e6,0x62d,0x610)+_0x3a42e5(0x21a,0x24a,0x1c8,0x1f9,0x24c)&&_0x3dfda7!==_0x3ebe2f(0x157,0xd9,0x151,0x16f,0x124)+_0x3ebe2f(0x109,0x181,0x130,0xf1,0x144)+_0x3ebe2f(0xfb,0x12c,0x19a,0x136,0x141)+_0x3ebe2f(0xee,0x15b,0x17e,0x1a4,0x150)+_0x3ebe2f(0x172,0xf4,0xb0,0xcb,0x110)+_0x21e40d(0x479,0x46e,0x452,0x41e,0x486)+'db'&&_0x3dfda7!==_0x21e40d(0x410,0x40f,0x429,0x459,0x44c)+_0x3a42e5(0xf8,0x172,0x138,0x159,0x116)+_0x21e40d(0x45f,0x4c1,0x474,0x4bf,0x438)+_0x21e40d(0x3bb,0x43d,0x408,0x3a8,0x41e)+'nt'&&_0x3dfda7!==_0x3ebe2f(0x105,0x10b,0x135,0xe1,0x12a)+_0x4f8d43(0x552,0x56e,0x585,0x552,0x56b)&&_0x3dfda7!==_0x3a42e5(0x1b8,0x193,0x21c,0x1bd,0x19c)+_0x4f8d43(0x5a8,0x5f6,0x5de,0x5bd,0x5a2)&&_0x3dfda7!==_0x21e40d(0x3b6,0x3c6,0x3d3,0x412,0x436)+_0x1c60ab(0x59c,0x5bb,0x58f,0x598,0x5aa)+_0x4f8d43(0x5ef,0x5e9,0x5fe,0x5f7,0x645)&&_0x3dfda7!==_0x3a42e5(0x1af,0x189,0x166,0x197,0x185)+_0x1c60ab(0x63a,0x637,0x5fb,0x650,0x5b1)&&_0x3dfda7!==_0x4f8d43(0x5c9,0x5d8,0x5fd,0x5e5,0x5e8)+_0x21e40d(0x3d3,0x3b0,0x405,0x3b4,0x401)+_0x21e40d(0x3da,0x395,0x3d1,0x416,0x3d2)&&_0x3dfda7!==_0x3ebe2f(0x123,0x1a7,0x13a,0x12e,0x174)+_0x21e40d(0x458,0x45e,0x444,0x3ec,0x440)&&_0x3dfda7!==_0x3ebe2f(0x1b8,0x191,0x18b,0x171,0x156)+_0x3a42e5(0x129,0x11d,0x171,0x180,0x1db)+_0x1c60ab(0x5d2,0x627,0x5f8,0x5c4,0x5f0)+'ts'&&_0x3dfda7!==_0x3a42e5(0x12c,0xfa,0x1b2,0x157,0x17e)+_0x4f8d43(0x5ac,0x606,0x5b2,0x567,0x550)&&_0x3dfda7!==_0x3ebe2f(0x159,0x19c,0x136,0x132,0x156)+_0x1c60ab(0x59b,0x5a5,0x592,0x57f,0x546)+_0x3a42e5(0x15c,0x17e,0x1d9,0x179,0x1d2)&&_0x3dfda7!==_0x4f8d43(0x5b1,0x5bb,0x604,0x606,0x580)+_0x4f8d43(0x5e1,0x5f4,0x5d3,0x61d,0x639)+_0x21e40d(0x440,0x48d,0x456,0x410,0x467)+_0x1c60ab(0x5a5,0x554,0x570,0x59a,0x5bb)+'ns'&&_0x3dfda7!==_0x3ebe2f(0x176,0x15f,0xd6,0x16a,0x123)+'rk'&&_0x3dfda7!==_0x1c60ab(0x579,0x586,0x5c7,0x589,0x5bf)+_0x21e40d(0x411,0x40f,0x3d5,0x433,0x417)+_0x21e40d(0x3f2,0x44f,0x43c,0x433,0x461)&&_0x3dfda7!==_0x1c60ab(0x5f0,0x600,0x5c7,0x5b9,0x595)+_0x3a42e5(0x12a,0x168,0x1ab,0x170,0x1c7)&&_0x3dfda7!==_0x1c60ab(0x59c,0x548,0x55f,0x53f,0x528)+_0x21e40d(0x3c2,0x3b1,0x406,0x458,0x3cd)+_0x3ebe2f(0x72,0xd5,0xbb,0xe1,0xcd)&&_0x3dfda7!==_0x1c60ab(0x580,0x55b,0x573,0x53e,0x561)+_0x3a42e5(0xf6,0x13b,0x13c,0x145,0x1a6)+_0x3ebe2f(0x183,0x193,0x1b0,0x180,0x15b)+_0x3a42e5(0x196,0x197,0x15d,0x16e,0x1b2)+_0x1c60ab(0x54c,0x552,0x56b,0x5ca,0x5bb)+_0x3a42e5(0x21d,0x18b,0x183,0x1c2,0x1ec)&&_0x3dfda7!==_0x3a42e5(0x1fc,0x1f7,0x198,0x1fa,0x246)+_0x1c60ab(0x60d,0x599,0x5c9,0x61b,0x625)&&_0x3dfda7!==_0x4f8d43(0x5db,0x5e2,0x589,0x590,0x5e1)+_0x3ebe2f(0x115,0xad,0xc1,0x12b,0xed)+'m'&&_0x3dfda7!==_0x4f8d43(0x5d1,0x605,0x58c,0x586,0x5cb)+_0x3a42e5(0x11e,0x1ce,0x19f,0x176,0x193)&&_0x3dfda7!==_0x1c60ab(0x5d8,0x5f1,0x604,0x62d,0x5cf)+_0x3ebe2f(0x141,0xf7,0x12c,0x112,0x11c)+_0x1c60ab(0x553,0x5dd,0x585,0x542,0x567)&&_0x3dfda7!==_0x3ebe2f(0x10a,0xc2,0xd1,0xca,0xbf)+_0x21e40d(0x466,0x43f,0x450,0x410,0x3fa)&&!_0x3dfda7[_0x1c60ab(0x5ec,0x5a7,0x594,0x588,0x566)+_0x4f8d43(0x56e,0x598,0x57e,0x562,0x50c)](_0x3ebe2f(0x8f,0x113,0x13c,0x102,0xe6)+_0x3a42e5(0x1b2,0x18b,0x1b5,0x1c4,0x219)));_0x2a74cd[_0x3a42e5(0x13d,0x199,0x117,0x14b,0x1a1)+'r'](_0xbfef42=>_0xbfef42!==_0x1c60ab(0x5ae,0x579,0x5b9,0x604,0x5bf)+_0x21e40d(0x3e9,0x3f7,0x41f,0x42b,0x3f2)+_0x1c60ab(0x579,0x593,0x5c2,0x617,0x56d))[_0x3a42e5(0x117,0x1bc,0x161,0x178,0x1ab)+'ch'](_0x4e84b2=>{function _0x510917(_0x286606,_0x155865,_0x5c8a34,_0x15702d,_0x18b6a1){return _0x1c60ab(_0x286606-0x95,_0x155865-0xcc,_0x15702d- -0x4e3,_0x15702d-0x122,_0x5c8a34);}function _0x1fbaca(_0x4a0dee,_0x2ce197,_0x4f3e41,_0x42ef74,_0x3b4a63){return _0x1c60ab(_0x4a0dee-0x1be,_0x2ce197-0xef,_0x3b4a63- -0x3e7,_0x42ef74-0x1ee,_0x42ef74);}function _0x59d4c2(_0x86243f,_0x26c1e0,_0x2d9c9,_0x2a49bd,_0x8f474b){return _0x21e40d(_0x2d9c9,_0x26c1e0-0xb6,_0x8f474b- -0x448,_0x2a49bd-0xda,_0x8f474b-0x1ca);}function _0x3da4e1(_0x1124b1,_0x599fff,_0x5bbfc5,_0x4327e8,_0x302cd1){return _0x4f8d43(_0x599fff- -0x435,_0x599fff-0x8d,_0x5bbfc5-0x65,_0x4327e8-0x57,_0x4327e8);}function _0x387406(_0x2b34c6,_0x340ff2,_0x1934da,_0x309127,_0x49cdfa){return _0x3ebe2f(_0x2b34c6-0x1d3,_0x1934da,_0x1934da-0x1bd,_0x309127-0x118,_0x49cdfa-0x3c0);}if(_0x2d353f[_0x1fbaca(0x1f7,0x1e0,0x1c3,0x1de,0x1cb)](_0x2d353f[_0x1fbaca(0x166,0x190,0x1d6,0x164,0x18f)],_0x2d353f[_0x1fbaca(0x185,0x13d,0x19a,0x14d,0x18f)])){if(_0x2d353f[_0x1fbaca(0x1ec,0x224,0x21e,0x234,0x1f9)](_0x4e84b2,_0x2d353f[_0x387406(0x4f5,0x50a,0x4ec,0x50f,0x4ef)]))_0x2d353f[_0x59d4c2(-0x83,-0x85,0x3,-0x4b,-0x23)](_0x2d353f[_0x1fbaca(0x150,0x172,0x190,0x194,0x174)],_0x2d353f[_0x1fbaca(0x1d2,0x134,0x168,0x198,0x174)])?rimraf[_0x510917(0x15a,0xcb,0xc8,0x103,0x117)+'f'](path[_0x59d4c2(0x40,-0x35,-0x38,0x16,0x1b)](playwrightOpts[_0x1fbaca(0x197,0x13e,0x1de,0x1bf,0x196)+_0x3da4e1(0xfa,0xfc,0xf5,0xec,0x125)+'r'],_0x2d353f[_0x59d4c2(0x4a,0x69,0x52,0x7a,0x1d)],_0x4e84b2)):_0x2f2472[_0x510917(0x165,0x125,0x11f,0x103,0x137)+'f'](_0x64c227[_0x59d4c2(-0x23,0x23,0x4e,0x3c,0x1b)](_0x12baf3[_0x387406(0x4c4,0x49b,0x483,0x46e,0x4b1)+_0x510917(0xbd,0x59,0x29,0x67,0x2a)+'r'],_0xdcdbee));else{if(_0x2d353f[_0x59d4c2(0x1e,-0x5e,0x1c,-0x19,-0x23)](_0x2d353f[_0x510917(0xa8,0x88,0x25,0x80,0x20)],_0x2d353f[_0x510917(0x137,0x9d,0x111,0xf4,0xb1)]))return _0x46e9ba[_0x510917(0xe9,0xa8,0x106,0xad,0x105)+_0x510917(0x77,0xb1,0x113,0xb7,0xbc)]()[_0x387406(0x49b,0x524,0x4c4,0x4a9,0x4ec)+'h'](UNOjef[_0x387406(0x519,0x4d5,0x579,0x4d2,0x527)])[_0x1fbaca(0x1bf,0x146,0x1a5,0x17f,0x1a9)+_0x1fbaca(0x1a0,0x1c9,0x1be,0x1d6,0x1b3)]()[_0x510917(0xfc,0xcc,0xc2,0xb5,0xe7)+_0x1fbaca(0x1a8,0x210,0x1c0,0x260,0x20a)+'r'](_0x2c31b5)[_0x1fbaca(0x223,0x1ab,0x222,0x1bb,0x1d1)+'h'](UNOjef[_0x1fbaca(0x1be,0x21c,0x1f6,0x255,0x20c)]);else{let _0x5bc4cb=fs[_0x387406(0x511,0x490,0x473,0x453,0x4b5)+_0x387406(0x4ad,0x523,0x4e0,0x488,0x4eb)+'c'](path[_0x3da4e1(0x171,0x1a2,0x1a5,0x151,0x18f)](playwrightOpts[_0x510917(0x90,0x3e,0xf9,0x9a,0x61)+_0x387406(0x447,0x483,0x45b,0x444,0x47e)+'r'],_0x2d353f[_0x510917(0x135,0x116,0x11d,0x10f,0xf9)],_0x2d353f[_0x59d4c2(-0x2b,-0x7b,0x18,0x21,-0x1a)]));for(const _0x1e063a of _0x5bc4cb){if(_0x2d353f[_0x510917(0x22,0x5d,0x7b,0x66,0x30)](_0x2d353f[_0x59d4c2(0x31,0x10,0x59,0x41,0x4)],_0x2d353f[_0x1fbaca(0x1bf,0x26f,0x1e5,0x21c,0x218)])){if(_0x1e063a[_0x59d4c2(-0x62,-0x76,-0x8,-0x57,-0x41)+_0x510917(0xbd,0xe9,0xe9,0xa4,0x44)](_0x2d353f[_0x1fbaca(0x18d,0x221,0x18c,0x1d4,0x1e7)]))return;rimraf[_0x387406(0x4c1,0x51d,0x4bd,0x4cd,0x51a)+'f'](_0x5bc4cb);}else{const _0x37eef5=_0x4afe00?function(){function _0x2ae0d3(_0x159453,_0x59a12c,_0x1f6400,_0xedbaf1,_0x14db76){return _0x3da4e1(_0x159453-0x132,_0x1f6400- -0x230,_0x1f6400-0x1a2,_0x159453,_0x14db76-0x35);}if(_0x5e5c68){const _0x19958f=_0x56e46a[_0x2ae0d3(-0x10c,-0x8a,-0xd1,-0x84,-0xf4)](_0x2b2a42,arguments);return _0x2f3e36=null,_0x19958f;}}:function(){};return _0x7cf68c=![],_0x37eef5;}}}}}else{if(_0x2d353f[_0x1fbaca(0x15e,0x14b,0x1c3,0x1dd,0x19d)](_0x51966a,_0x2d353f[_0x3da4e1(0x1bc,0x16d,0x1c2,0x1c3,0x141)]))_0x1aeb4c[_0x387406(0x4da,0x553,0x572,0x4ec,0x51a)+'f'](_0x1758eb[_0x3da4e1(0x169,0x1a2,0x14a,0x19d,0x16d)](_0x3b1ec3[_0x387406(0x4fe,0x50c,0x485,0x472,0x4b1)+_0x510917(0x9e,0x7d,0xc5,0x67,0x26)+'r'],_0x2d353f[_0x510917(0x146,0x151,0xbf,0x10f,0x11b)],_0x2be616));else{let _0x3ebb7a=_0x2172e7[_0x1fbaca(0x1ec,0x1b8,0x166,0x1bd,0x19a)+_0x387406(0x49b,0x4ce,0x548,0x4bb,0x4eb)+'c'](_0x2db7fe[_0x1fbaca(0x1f3,0x23e,0x1b3,0x1f0,0x209)](_0x24a046[_0x59d4c2(-0x93,-0x48,-0xf,-0x70,-0x58)+_0x59d4c2(-0x56,-0x5e,-0x49,-0xe3,-0x8b)+'r'],_0x2d353f[_0x387406(0x549,0x4fa,0x4ff,0x56c,0x526)],_0x2d353f[_0x59d4c2(0xa,0x39,-0x37,-0x57,-0x1a)]));for(const _0x152cc3 of _0x3ebb7a){if(_0x152cc3[_0x1fbaca(0x19a,0x1f2,0x1c4,0x190,0x1ad)+_0x387406(0x46c,0x4db,0x51d,0x47c,0x4bb)](_0x2d353f[_0x1fbaca(0x1e6,0x1fb,0x249,0x1c7,0x1e7)]))return;_0x54ead4[_0x510917(0x106,0x11f,0x120,0x103,0xdb)+'f'](_0x3ebb7a);}}}});}else{let _0x5ca877=_0x2414b5[_0x3a42e5(0x131,0x1c4,0x1ce,0x16f,0x184)+_0x21e40d(0x3d6,0x3ec,0x42a,0x3eb,0x463)+'c'](_0xc178b0[_0x1c60ab(0x61c,0x59c,0x5f0,0x5ac,0x603)](_0x2cb521[_0x21e40d(0x396,0x399,0x3f0,0x3fb,0x3ec)+_0x21e40d(0x396,0x378,0x3bd,0x37c,0x41a)+'r'],_0x2d353f[_0x3a42e5(0x22b,0x22f,0x1b5,0x1e0,0x20a)],_0x2d353f[_0x3a42e5(0x205,0x1ea,0x1d9,0x1a9,0x1fd)]));for(const _0x19435f of _0x5ca877){if(_0x19435f[_0x21e40d(0x422,0x463,0x407,0x430,0x436)+_0x4f8d43(0x56e,0x5c3,0x52e,0x533,0x5b3)](_0x2d353f[_0x4f8d43(0x5b5,0x5b7,0x583,0x582,0x602)]))return;_0x33696e[_0x3a42e5(0x184,0x1d4,0x1b3,0x1d4,0x1db)+'f'](_0x5ca877);}}}});},typeof this[_0xf75a6b(0x9b,0xe2,0x4b,0xe8,0x7f)+'ns'][_0xf75a6b(0x109,0x10b,0x148,0x117,0x11e)+_0x52d7a2(0x8b,0x94,0xc4,0xc5,0x75)+_0x1faf5c(0x4e9,0x4e8,0x4e9,0x552,0x54a)+'n']===_0xf75a6b(0x83,0x88,0x51,0xbb,0x29)+'r'?this[_0x534f02(-0x133,-0x148,-0x121,-0x1a4,-0x181)+'ns'][_0x1faf5c(0x614,0x5c5,0x627,0x64e,0x5ee)+_0x52d7a2(0xe8,0xf5,0xe1,0xc5,0x110)+_0xf75a6b(0x65,0xd,0xe,0x61,0x53)+'n']:(-0x4*-0x293+0x251*-0x4+0x7*-0x25)*(-0x22*-0x1d+0x2282+-0x2620)*(0x1*0x118c+0x183*-0x6+-0x492)));
        
        if (this.options.userAgent) {
            await page.setExtraHTTPHeaders({
                'User-Agent': this.options.userAgent
            })
        }

        this.pupBrowser = browser;
        this.pupPage = page;

        await this.authStrategy.afterBrowserInitialized();

        await page.goto(WhatsWebURL, {
            waituntil: 'domcontentloaded',
            timeout: 0,
            referer: 'https://whatsapp.com/'
        });

        await page.addScriptTag({
            path: require.resolve('@wppconnect/wa-js')
        })

        await page.waitForFunction(() => window.WPP?.isReady)

        await page.evaluate(({ markOnlineAvailable, isBeta }) => {
            WPP.chat.defaultSendMessageOptions.createChat = true
            if (markOnlineAvailable) WPP.conn.setKeepAlive(markOnlineAvailable)
            if (isBeta) WPP.conn.joinWebBeta(true)
        }, { markOnlineAvailable: this.options.markOnlineAvailable, isBeta: this.options.isBeta })
            .catch(() => false)

        await page.evaluate(`function getElementByXpath(path) {
            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          }`);

        let lastPercent = null,
            lastPercentMessage = null;

        await page.exposeFunction('loadingScreen', async (percent, message) => {
            if (lastPercent !== percent || lastPercentMessage !== message) {
                this.emit(Events.LOADING_SCREEN, percent, message);
                lastPercent = percent;
                lastPercentMessage = message;
            }
        });

        await page.evaluate(
            async function (selectors) {
                var observer = new MutationObserver(function () {
                    let progressBar = window.getElementByXpath(
                        selectors.PROGRESS
                    );
                    let progressMessage = window.getElementByXpath(
                        selectors.PROGRESS_MESSAGE
                    );

                    if (progressBar) {
                        window.loadingScreen(
                            progressBar.value,
                            progressMessage.innerText
                        );
                    }
                });

                observer.observe(document, {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true,
                });
            },
            {
                PROGRESS: '//*[@id=\'app\']/div/div/div[2]/progress',
                PROGRESS_MESSAGE: '//*[@id=\'app\']/div/div/div[3]',
            }
        );

        const INTRO_IMG_SELECTOR = '[data-testid="intro-md-beta-logo-dark"], [data-testid="intro-md-beta-logo-light"], [data-asset-intro-image-light="true"], [data-asset-intro-image-dark="true"]';
        const INTRO_QRCODE_SELECTOR = 'div[data-ref] canvas';

        // Checks which selector appears first
        const needAuthentication = await Promise.race([
            new Promise(resolve => {
                page.waitForSelector(INTRO_IMG_SELECTOR, { timeout: this.options.authTimeoutMs })
                    .then(() => resolve(false))
                    .catch((err) => resolve(err));
            }),
            new Promise(resolve => {
                page.waitForSelector(INTRO_QRCODE_SELECTOR, { timeout: this.options.authTimeoutMs })
                    .then(() => resolve(true))
                    .catch((err) => resolve(err));
            })
        ]);

        // Checks if an error occurred on the first found selector. The second will be discarded and ignored by .race;
        if (needAuthentication instanceof Error) throw needAuthentication;

        // Scan-qrcode selector was found. Needs authentication
        if (needAuthentication) {
            const { failed, failureEventPayload, restart } = await this.authStrategy.onAuthenticationNeeded();
            if (failed) {
                /**
                 * Emitted when there has been an error while trying to restore an existing session
                 * @event Client#auth_failure
                 * @param {string} message
                 */
                this.emit(Events.AUTHENTICATION_FAILURE, failureEventPayload);
                await this.destroy();
                if (restart) {
                    // session restore failed so try again but without session to force new authentication
                    return this.initialize();
                }
                return;
            }

            const QR_CONTAINER = 'div[data-ref]';
            const QR_RETRY_BUTTON = 'div[data-ref] > span > button';
            let qrRetries = 0;
            await page.exposeFunction('qrChanged', async (qr) => {
                /**
                * Emitted when a QR code is received
                * @event Client#qr
                * @param {string} qr QR Code
                */
                this.emit(Events.QR_RECEIVED, qr);
                if (this.options.qrMaxRetries > 0) {
                    qrRetries++;
                    if (qrRetries > this.options.qrMaxRetries) {
                        this.emit(Events.DISCONNECTED, 'Max qrcode retries reached');
                        await this.destroy();
                    }
                }
            });

            await page.evaluate(function (selectors) {
                const qr_container = document.querySelector(selectors.QR_CONTAINER);
                window.qrChanged(qr_container.dataset.ref);

                const obs = new MutationObserver((muts) => {
                    muts.forEach(mut => {
                        // Listens to qr token change
                        if (mut.type === 'attributes' && mut.attributeName === 'data-ref') {
                            window.qrChanged(mut.target.dataset.ref);
                        } else
                            // Listens to retry button, when found, click it
                            if (mut.type === 'childList') {
                                const retry_button = document.querySelector(selectors.QR_RETRY_BUTTON);
                                if (retry_button) retry_button.click();
                            }
                    });
                });
                obs.observe(qr_container.parentElement, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    attributeFilter: ['data-ref'],
                });
            }, {
                QR_CONTAINER,
                QR_RETRY_BUTTON
            });

            // Wait for code scan
            try {
                await page.waitForSelector(INTRO_IMG_SELECTOR, { timeout: 0 });
            } catch (error) {
                if (
                    error.name === 'ProtocolError' &&
                    error.message &&
                    error.message.match(/Target closed/)
                ) {
                    // something has called .destroy() while waiting
                    return;
                }

                throw error;
            }

        }

        await page.evaluate(ExposeStore, moduleRaid.toString());
        const authEventPayload = await this.authStrategy.getAuthEventPayload();

        /**
         * Emitted when authentication is successful
         * @event Client#authenticated
         */
        this.emit(Events.AUTHENTICATED, authEventPayload);

        // Check window.Store Injection
        await page.waitForFunction(() => {
            return (
                typeof window.WWebJS !== 'undefined' &&
                typeof window.Store !== 'undefined'
            )
        })
        .catch(() => false);

        await page.evaluate(async () => {
            // safely unregister service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        });

        //Load util functions (serializers, helper functions)
        await page.evaluate(LoadUtils);

        // Expose client info
        /**
         * Current connection information
         * @type {ClientInfo}
         */
        this.info = new ClientInfo(this, await page.evaluate(() => {
            return { ...window.Store.Conn.serialize(), wid: window.Store.User.getMeUser() };
        }));

        // Add InterfaceController
        this.interface = new InterfaceController(this);

        // Register events
        await page.exposeFunction('onAddMessageEvent', msg => {
            if (msg.type === 'gp2') {
                const notification = new GroupNotification(this, msg);
                if (msg.subtype === 'add' || msg.subtype === 'invite') {
                    /**
                     * Emitted when a user joins the chat via invite link or is added by an admin.
                     * @event Client#group_join
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_JOIN, notification);
                } else if (msg.subtype === 'remove' || msg.subtype === 'leave') {
                    /**
                     * Emitted when a user leaves the chat or is removed by an admin.
                     * @event Client#group_leave
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_LEAVE, notification);
                } else if (msg.subtype === 'promote' || msg.subtype === 'demote') {
                    /**
                     * Emitted when a current user is promoted to an admin or demoted to a regular user.
                     * @event Client#group_admin_changed
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_ADMIN_CHANGED, notification);
                } else {
                    /**
                     * Emitted when group settings are updated, such as subject, description or picture.
                     * @event Client#group_update
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_UPDATE, notification);
                }
                return;
            }

            const message = new Message(this, msg);

            /**
             * Emitted when a new message is created, which may include the current user's own messages.
             * @event Client#message_create
             * @param {Message} message The message that was created
             */
            this.emit(Events.MESSAGE_CREATE, message);

            if (msg.id.fromMe) return;

            /**
             * Emitted when a new message is received.
             * @event Client#message
             * @param {Message} message The message that was received
             */
            this.emit(Events.MESSAGE_RECEIVED, message);
        });

        let last_message;

        await page.exposeFunction('onChangeMessageTypeEvent', (msg) => {

            if (msg.type === 'revoked') {
                const message = new Message(this, msg);
                let revoked_msg;
                if (last_message && msg.id.id === last_message.id.id) {
                    revoked_msg = new Message(this, last_message);
                }

                /**
                 * Emitted when a message is deleted for everyone in the chat.
                 * @event Client#message_revoke_everyone
                 * @param {Message} message The message that was revoked, in its current state. It will not contain the original message's data.
                 * @param {?Message} revoked_msg The message that was revoked, before it was revoked. It will contain the message's original data. 
                 * Note that due to the way this data is captured, it may be possible that this param will be undefined.
                 */
                this.emit(Events.MESSAGE_REVOKED_EVERYONE, message, revoked_msg);
            }

        });

        await page.exposeFunction('onChangeMessageEvent', (msg) => {

            if (msg.type !== 'revoked') {
                last_message = msg;
            }

            /**
             * The event notification that is received when one of
             * the group participants changes thier phone number.
             */
            const isParticipant = msg.type === 'gp2' && msg.subtype === 'modify';

            /**
             * The event notification that is received when one of
             * the contacts changes thier phone number.
             */
            const isContact = msg.type === 'notification_template' && msg.subtype === 'change_number';

            if (isParticipant || isContact) {
                /** {@link GroupNotification} object does not provide enough information about this event, so a {@link Message} object is used. */
                const message = new Message(this, msg);

                const newId = isParticipant ? msg.recipients[0] : msg.to;
                const oldId = isParticipant ? msg.author : msg.templateParams.find(id => id !== newId);

                /**
                 * Emitted when a contact or a group participant changes their phone number.
                 * @event Client#contact_changed
                 * @param {Message} message Message with more information about the event.
                 * @param {String} oldId The user's id (an old one) who changed their phone number
                 * and who triggered the notification.
                 * @param {String} newId The user's new id after the change.
                 * @param {Boolean} isContact Indicates if a contact or a group participant changed their phone number.
                 */
                this.emit(Events.CONTACT_CHANGED, message, oldId, newId, isContact);
            }
        });

        await page.exposeFunction('onRemoveMessageEvent', (msg) => {

            if (!msg.isNewMsg) return;

            const message = new Message(this, msg);

            /**
             * Emitted when a message is deleted by the current user.
             * @event Client#message_revoke_me
             * @param {Message} message The message that was revoked
             */
            this.emit(Events.MESSAGE_REVOKED_ME, message);

        });

        await page.exposeFunction('onMessageAckEvent', (msg, ack) => {

            const message = new Message(this, msg);

            /**
             * Emitted when an ack event occurrs on message type.
             * @event Client#message_ack
             * @param {Message} message The message that was affected
             * @param {MessageAck} ack The new ACK value
             */
            this.emit(Events.MESSAGE_ACK, message, ack);

        });

        await page.exposeFunction('onMessageMediaUploadedEvent', (msg) => {

            const message = new Message(this, msg);

            /**
             * Emitted when media has been uploaded for a message sent by the client.
             * @event Client#media_uploaded
             * @param {Message} message The message with media that was uploaded
             */
            this.emit(Events.MEDIA_UPLOADED, message);
        });

        await page.exposeFunction('onAppStateChangedEvent', async (state) => {

            /**
             * Emitted when the connection state changes
             * @event Client#change_state
             * @param {WAState} state the new connection state
             */
            this.emit(Events.STATE_CHANGED, state);

            const ACCEPTED_STATES = [WAState.CONNECTED, WAState.OPENING, WAState.PAIRING, WAState.TIMEOUT];

            if (this.options.takeoverOnConflict) {
                ACCEPTED_STATES.push(WAState.CONFLICT);

                if (state === WAState.CONFLICT) {
                    setTimeout(() => {
                        this.pupPage.evaluate(() => window.Store.AppState.takeover());
                    }, this.options.takeoverTimeoutMs);
                }
            }

            if (!ACCEPTED_STATES.includes(state)) {
                /**
                 * Emitted when the client has been disconnected
                 * @event Client#disconnected
                 * @param {WAState|"NAVIGATION"} reason reason that caused the disconnect
                 */
                await this.authStrategy.disconnect();
                this.emit(Events.DISCONNECTED, state);
                this.destroy();
            }
        });

        await page.exposeFunction('onBatteryStateChangedEvent', (state) => {
            const { battery, plugged } = state;

            if (battery === undefined) return;

            /**
             * Emitted when the battery percentage for the attached device changes. Will not be sent if using multi-device.
             * @event Client#change_battery
             * @param {object} batteryInfo
             * @param {number} batteryInfo.battery - The current battery percentage
             * @param {boolean} batteryInfo.plugged - Indicates if the phone is plugged in (true) or not (false)
             * @deprecated
             */
            this.emit(Events.BATTERY_CHANGED, { battery, plugged });
        });

        await page.exposeFunction('onIncomingCall', (call) => {
            /**
             * Emitted when a call is received
             * @event Client#incoming_call
             * @param {object} call
             * @param {number} call.id - Call id
             * @param {string} call.peerJid - Who called
             * @param {boolean} call.isVideo - if is video
             * @param {boolean} call.isGroup - if is group
             * @param {boolean} call.canHandleLocally - if we can handle in waweb
             * @param {boolean} call.outgoing - if is outgoing
             * @param {boolean} call.webClientShouldHandle - If Waweb should handle
             * @param {object} call.participants - Participants
             */
            const cll = new Call(this, call);
            this.emit(Events.INCOMING_CALL, cll);
        });

        await page.exposeFunction('onPollVote', (vote) => {
            const vote_ = new PollVote(this, vote);
            /**
             * Emitted when a poll vote is received
             * @event Client#poll_vote
             * @param {object} vote
             * @param {string} vote.sender Sender of the vote
             * @param {number} vote.senderTimestampMs Timestamp the vote was sent
             * @param {Array<string>} vote.selectedOptions Options selected
             */
            this.emit(Events.POLL_VOTE, vote_);
        });

        await page.exposeFunction('onReaction', (reactions) => {
            for (const reaction of reactions) {
                /**
                 * Emitted when a reaction is sent, received, updated or removed
                 * @event Client#message_reaction
                 * @param {object} reaction
                 * @param {object} reaction.id - Reaction id
                 * @param {number} reaction.orphan - Orphan
                 * @param {?string} reaction.orphanReason - Orphan reason
                 * @param {number} reaction.timestamp - Timestamp
                 * @param {string} reaction.reaction - Reaction
                 * @param {boolean} reaction.read - Read
                 * @param {object} reaction.msgId - Parent message id
                 * @param {string} reaction.senderId - Sender id
                 * @param {?number} reaction.ack - Ack
                 */

                this.emit(Events.MESSAGE_REACTION, new Reaction(this, reaction));
            }
        });

        await page.evaluate(() => {
            window.Store.Msg.on('change', (msg) => { window.onChangeMessageEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('change:type', (msg) => { window.onChangeMessageTypeEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('change:ack', (msg, ack) => { window.onMessageAckEvent(window.WWebJS.getMessageModel(msg), ack); });
            window.Store.Msg.on('change:isUnsentMedia', (msg, unsent) => { if (msg.id.fromMe && !unsent) window.onMessageMediaUploadedEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('remove', (msg) => { if (msg.isNewMsg) window.onRemoveMessageEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.AppState.on('change:state', (_AppState, state) => { window.onAppStateChangedEvent(state); });
            window.Store.Conn.on('change:battery', (state) => { window.onBatteryStateChangedEvent(state); });
            window.Store.Call.on('add', (call) => {
                if (call.isGroup) {
                    window.onIncomingCall(call)
                }
            });
            window.Store.Call.on('change:_state change:state', (call) => {
                if (call.getState() === 'INCOMING_RING') {
                    window.onIncomingCall(call);
                };
            });
            window.Store.Msg.on('add', (msg) => {
                if (msg.isNewMsg) {
                    if (msg.type === 'ciphertext') {
                        // defer message event until ciphertext is resolved (type changed)
                        msg.once('change:type', (_msg) => window.onAddMessageEvent(window.WWebJS.getMessageModel(_msg)));
                    } else {
                        window.onAddMessageEvent(window.WWebJS.getMessageModel(msg));
                    }
                }
            });

            window.Store.PollVote.on('add', (vote) => {
                if (vote.parentMsgKey) vote.pollCreationMessage = window.Store.Msg.get(vote.parentMsgKey).serialize();
                window.onPollVote(vote);
            });

            {
                const module = window.Store.createOrUpdateReactionsModule;
                const ogMethod = module.createOrUpdateReactions;
                module.createOrUpdateReactions = ((...args) => {
                    window.onReaction(args[0].map(reaction => {
                        const msgKey = window.Store.MsgKey.fromString(reaction.msgKey);
                        const parentMsgKey = window.Store.MsgKey.fromString(reaction.parentMsgKey);
                        const timestamp = reaction.timestamp / 1000;

                        return { ...reaction, msgKey, parentMsgKey, timestamp };
                    }));

                    return ogMethod(...args);
                }).bind(module);
            }
        });

        /**
         * Emitted when the client has initialized and is ready to receive messages.
         * @event Client#ready
         */
        this.emit(Events.READY);
        this.authStrategy.afterAuthReady();

        // Disconnect when navigating away when in PAIRING state (detect logout)
        this.pupPage.on('framenavigated', async () => {
            const appState = await this.getState();
            if (!appState || appState === WAState.PAIRING) {
                await this.authStrategy.disconnect();
                this.emit(Events.DISCONNECTED, 'NAVIGATION');
                await this.destroy();
            }
        });
    }

    /**
     * Closes the client
     */
    async destroy() {
        await this.pupBrowser.close();
        await this.authStrategy.destroy();
    }

    /**
     * Logs out the client, closing the current session
     */
    async logout() {
        await this.pupPage.evaluate(() => {
            return window.Store.AppState.logout();
        });

        await this.authStrategy.logout();
    }

    /**
     * Returns the version of WhatsApp Web currently being run
     * @returns {Promise<string>}
     */
    async getWWebVersion() {
        return await this.pupPage.evaluate(() => {
            return window.Debug.VERSION;
        });
    }

    /**
     * Mark as seen for the Chat
     *  @param {string} chatId
     *  @returns {Promise<boolean>} result
     * 
     */
    async sendSeen(chatId) {
        const result = await this.pupPage.evaluate(async (chatId) => {
            return window.WWebJS.sendSeen(chatId);

        }, chatId);
        return result;
    }

    /**
     * Message options.
     * @typedef {Object} MessageSendOptions
     * @property {boolean} [linkPreview=true] - Show links preview. Has no effect on multi-device accounts.
     * @property {boolean} [sendAudioAsVoice=false] - Send audio as voice message
     * @property {boolean} [sendVideoAsGif=false] - Send video as gif
     * @property {boolean} [sendMediaAsSticker=false] - Send media as a sticker
     * @property {boolean} [sendMediaAsDocument=false] - Send media as a document
     * @property {boolean} [parseVCards=true] - Automatically parse vCards and send them as contacts
     * @property {string} [caption] - Image or video caption
     * @property {string} [quotedMessageId] - Id of the message that is being quoted (or replied to)
     * @property {Contact[]} [mentions] - Contacts that are being mentioned in the message
     * @property {boolean} [sendSeen=true] - Mark the conversation as seen after sending the message
     * @property {string} [stickerAuthor=undefined] - Sets the author of the sticker, (if sendMediaAsSticker is true).
     * @property {string} [stickerName=undefined] - Sets the name of the sticker, (if sendMediaAsSticker is true).
     * @property {string[]} [stickerCategories=undefined] - Sets the categories of the sticker, (if sendMediaAsSticker is true). Provide emoji char array, can be null.
     * @property {MessageMedia} [media] - Media to be sent
     */

    /**
     * Send a message to a specific chatId
     * @param {string} chatId
     * @param {string|MessageMedia|Location|Contact|Array<Contact>|Buttons|List} content
     * @param {MessageSendOptions} [options] - Options used when sending the message
     * 
     * @returns {Promise<Message>} Message that was just sent
     */
    async sendMessage(chatId, content, options = {}) {
        let internalOptions = {
            linkPreview: options.linkPreview === false ? undefined : true,
            sendAudioAsVoice: options.sendAudioAsVoice,
            sendVideoAsGif: options.sendVideoAsGif,
            sendMediaAsSticker: options.sendMediaAsSticker,
            sendMediaAsDocument: options.sendMediaAsDocument,
            caption: options.caption,
            quotedMessageId: options.quoted?.id ? (options.quoted._serialized || options.quoted.id._serialized) : options.quoted,
            parseVCards: options.parseVCards === false ? false : true,
            mentionedJidList: Array.isArray(options.mentions) ? options.mentions.map(contact => contact.id._serialized) : [],
            extraOptions: options.extra
        };

        const sendSeen = typeof options.sendSeen === 'undefined' ? true : options.sendSeen;

        if (content instanceof MessageMedia) {
            internalOptions.attachment = content;
            content = '';
        } else if (options.media instanceof MessageMedia) {
            internalOptions.attachment = options.media;
            internalOptions.caption = content;
            content = '';
        } else if (content instanceof Location) {
            internalOptions.location = content;
            content = '';
        } else if (content instanceof Contact) {
            internalOptions.contactCard = content.id._serialized;
            content = '';
        } else if (Array.isArray(content) && content.length > 0 && content[0] instanceof Contact) {
            internalOptions.contactCardList = content.map(contact => contact.id._serialized);
            content = '';
        } else if (content instanceof Buttons) {
            if (content.type !== 'chat') { internalOptions.attachment = content.body; }
            internalOptions.buttons = content;
            content = '';
        } else if (content instanceof List) {
            internalOptions.list = content;
            content = '';
        }

        if (internalOptions.sendMediaAsSticker && internalOptions.attachment) {
            internalOptions.attachment = await Util.formatToWebpSticker(
                internalOptions.attachment, {
                packName: options.packName,
                packPublish: options.packPublish,
                categories: options.categories
            }, this.pupPage
            );
        }

        const newMessage = await this.pupPage.evaluate(async ({ chatId, message, options, sendSeen }) => {
            const chatWid = window.Store.WidFactory.createWid(chatId);
            const chat = await window.Store.Chat.find(chatWid);


            if (sendSeen) {
                window.WWebJS.sendSeen(chatId);
            }

            const msg = await window.WWebJS.sendMessage(chat, message, options, sendSeen);
            return JSON.parse(JSON.stringify(msg));
        }, { chatId, message: content, options: internalOptions, sendSeen });

        return new Message(this, newMessage);
    }

    /**
     * Searches for messages
     * @param {string} query
     * @param {Object} [options]
     * @param {number} [options.page]
     * @param {number} [options.limit]
     * @param {string} [options.chatId]
     * @returns {Promise<Message[]>}
     */
    async searchMessages(query, options = {}) {
        const messages = await this.pupPage.evaluate(async ({ query, page, count, remote }) => {
            const { messages } = await window.Store.Msg.search(query, page, count, remote);
            return messages.map(msg => window.WWebJS.getMessageModel(msg));
        }, { query, page: options.page, limit: options.limit, remote: options.chatId });

        return messages.map(msg => new Message(this, msg));
    }

    /**
     * Get all current chat instances
     * @returns {Promise<Array<Chat>>}
     */
    async getChats() {
        let chats = await this.pupPage.evaluate(async () => {
            return await window.WWebJS.getChats();
        });

        return chats.map(chat => ChatFactory.create(this, chat));
    }

    /**
     * Get chat instance by ID
     * @param {string} chatId 
     * @returns {Promise<Chat>}
     */
    async getChatById(chatId) {
        let chat = await this.pupPage.evaluate(async chatId => {
            return await window.WWebJS.getChat(chatId);
        }, chatId);

        return ChatFactory.create(this, chat);
    }

    /**
     * 
     * @param {string} chatId 
     * @returns {Promise<GroupChat>}
     */
    async groupMetadata(chatId) {
        let chat = await this.pupPage.evaluate(async (chatId) => {
            let chatWid = await window.Store.WidFactory.createWid(chatId)
            let chat = await window.Store.GroupMetadata.find(chatWid)

            return chat.serialize()
        }, chatId)

        if (!chat) return false
        return chat
    }

    /**
     * Get all current contact instances
     * @returns {Promise<Array<Contact>>}
     */
    async getContacts() {
        let contacts = await this.pupPage.evaluate(() => {
            return window.WWebJS.getContacts();
        });

        return contacts.map(contact => ContactFactory.create(this, contact));
    }

    async saveContact(number) {
        let contact = await this.pupPage.evaluate(number => {
            return window.WWebJS.getContact(number);
        }, number);

        let res = ContactFactory.create(this, contact);
        return res.isMyContact
    }
    /**
     * Get contact instance by ID
     * @param {string} contactId
     * @returns {Promise<Contact>}
     */
    async getContactById(contactId) {
        let contact = await this.pupPage.evaluate(contactId => {
            return window.WWebJS.getContact(contactId);
        }, contactId);

        return ContactFactory.create(this, contact);
    }

    /**
     * Returns an object with information about the invite code's group
     * @param {string} inviteCode 
     * @returns {Promise<object>} Invite information
     */
    async getInviteInfo(inviteCode) {
        return await this.pupPage.evaluate(inviteCode => {
            return window.Store.InviteInfo.queryGroupInvite(inviteCode);
        }, inviteCode);
    }

    /**
     * Accepts an invitation to join a group
     * @param {string} inviteCode Invitation code
     * @returns {Promise<string>} Id of the joined Chat
     */
    async acceptInvite(inviteCode) {
        const res = await this.pupPage.evaluate(async inviteCode => {
            return await window.Store.Invite.joinGroupViaInvite(inviteCode);
        }, inviteCode);

        return res.gid._serialized;
    }

    /**
     * Accepts a private invitation to join a group
     * @param {object} inviteInfo Invite V4 Info
     * @returns {Promise<Object>}
     */
    async acceptGroupV4Invite(inviteInfo) {
        if (!inviteInfo.inviteCode) throw 'Invalid invite code, try passing the message.inviteV4 object';
        if (inviteInfo.inviteCodeExp == 0) throw 'Expired invite code';
        return this.pupPage.evaluate(async inviteInfo => {
            let { groupId, fromId, inviteCode, inviteCodeExp } = inviteInfo;
            return await window.Store.JoinInviteV4.sendJoinGroupViaInviteV4(inviteCode, String(inviteCodeExp), groupId, fromId);
        }, inviteInfo);
    }

    /**
     * Sets the current user's status message
     * @param {string} status New status message
     */
    async setStatus(status) {
        await this.pupPage.evaluate(async status => {
            return await window.Store.StatusUtils.setMyStatus(status);
        }, status);
    }

    /**
     * Sets the current user's display name. 
     * This is the name shown to WhatsApp users that have not added you as a contact beside your number in groups and in your profile.
     * @param {string} displayName New display name
     * @returns {Promise<Boolean>}
     */
    async setDisplayName(displayName) {
        const couldSet = await this.pupPage.evaluate(async displayName => {
            return window.WWebJS.profile.setMyProfileName(displayName)
        }, displayName);

        return couldSet;
    }

    /**
     * Gets the current connection state for the client
     * @returns {WAState} 
     */
    async getState() {
        return await this.pupPage.evaluate(() => {
            if (!window.Store) return null;
            return window.Store.AppState.state;
        });
    }

    /**
     * Marks the client as online
     */
    async sendPresenceAvailable() {
        return await this.pupPage.evaluate(() => {
            return window.Store.PresenceUtils.sendPresenceAvailable();
        });
    }

    /**
     * Marks the client as unavailable
     */
    async sendPresenceUnavailable() {
        return await this.pupPage.evaluate(() => {
            return window.Store.PresenceUtils.sendPresenceUnavailable();
        });
    }

    /**
     * Enables and returns the archive state of the Chat
     * @returns {boolean}
     */
    async archiveChat(chatId) {
        return await this.pupPage.evaluate(async chatId => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.archiveChat(chat, true);
            return true;
        }, chatId);
    }

    /**
     * Changes and returns the archive state of the Chat
     * @returns {boolean}
     */
    async unarchiveChat(chatId) {
        return await this.pupPage.evaluate(async chatId => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.archiveChat(chat, false);
            return false;
        }, chatId);
    }

    /**
     * Pins the Chat
     * @returns {Promise<boolean>} New pin state. Could be false if the max number of pinned chats was reached.
     */
    async pinChat(chatId) {
        return this.pupPage.evaluate(async chatId => {
            let chat = window.Store.Chat.get(chatId);
            if (chat.pin) {
                return true;
            }
            const MAX_PIN_COUNT = 3;
            const chatModels = window.Store.Chat.getModelsArray();
            if (chatModels.length > MAX_PIN_COUNT) {
                let maxPinned = chatModels[MAX_PIN_COUNT - 1].pin;
                if (maxPinned) {
                    return false;
                }
            }
            await window.Store.Cmd.pinChat(chat, true);
            return true;
        }, chatId);
    }

    /**
     * Unpins the Chat
     * @returns {Promise<boolean>} New pin state
     */
    async unpinChat(chatId) {
        return this.pupPage.evaluate(async chatId => {
            let chat = window.Store.Chat.get(chatId);
            if (!chat.pin) {
                return false;
            }
            await window.Store.Cmd.pinChat(chat, false);
            return false;
        }, chatId);
    }

    /**
     * Mutes this chat forever, unless a date is specified
     * @param {string} chatId ID of the chat that will be muted
     * @param {?Date} unmuteDate Date when the chat will be unmuted, leave as is to mute forever
     */
    async muteChat(chatId, unmuteDate) {
        unmuteDate = unmuteDate ? unmuteDate : -1;
        await this.pupPage.evaluate(async (chatId, timestamp) => {
            let chat = await window.Store.Chat.get(chatId);
            
            let canMute = chat.mute.canMute()
            if (!canMute) {
                throw `Can't mute this chat`
            }
            
            await chat.mute.mute({expiration: timestamp, sendDevice:!0});
        }, chatId, unmuteDate || -1);
    }

    /**
     * Unmutes the Chat
     * @param {string} chatId ID of the chat that will be unmuted
     */
    async unmuteChat(chatId) {
        await this.pupPage.evaluate(async chatId => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.muteChat(chat, false);
        }, chatId);
    }

    /**
     * 
     * @param {string} chatId ID of the chat that will be muted
     * @param {number} ephemeralDuration 
     */
    async setEphemeral(chatId, ephemeralDuration) {
        ephemeralDuration = ephemeralDuration ? ephemeralDuration : 0
        await this.pupPage.evaluate(async (chatId, ephemeralDuration) => {
            const chat = window.Store.Chat.get(chatId)

            if (chat.isGroup) {
                return await window.WWebJS.group.setProperty(chat.id, 'ephemeral', ephemeralDuration)
            }

            return await window.Store.ChangeEphemeralDuration(chat, ephemeralDuration).catch((e) => e)
        }, chatId, ephemeralDuration)
    }

    /**
     * Mark the Chat as unread
     * @param {string} chatId ID of the chat that will be marked as unread
     */
    async markChatUnread(chatId) {
        await this.pupPage.evaluate(async chatId => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.markChatUnread(chat, true);
        }, chatId);
    }

    /**
     * Returns the contact ID's profile picture URL, if privacy settings allow it
     * @param {string} contactId the whatsapp user's ID
     * @returns {Promise<string>}
     */
    async getProfilePicUrl(contactId) {
        const profilePic = await this.pupPage.evaluate(async contactId => {
            try {
                const chatWid = window.Store.WidFactory.createWid(contactId);
                return await window.Store.ProfilePic.profilePicFind(chatWid);
            } catch (err) {
                if (err.name === 'ServerStatusCodeError') return undefined;
                throw err;
            }
        }, contactId);

        return profilePic ? profilePic.eurl : undefined;
    }

    /**
     * Gets the Contact's common groups with you. Returns empty array if you don't have any common group.
     * @param {string} contactId the whatsapp user's ID (_serialized format)
     * @returns {Promise<WAWebJS.ChatId[]>}
     */
    async getCommonGroups(contactId) {
        const commonGroups = await this.pupPage.evaluate(async (contactId) => {
            let contact = window.Store.Contact.get(contactId);
            if (!contact) {
                const wid = window.Store.WidFactory.createUserWid(contactId);
                const chatConstructor = window.Store.Contact.getModelsArray().find(c => !c.isGroup).constructor;
                contact = new chatConstructor({ id: wid });
            }

            if (contact.commonGroups) {
                return contact.commonGroups.serialize();
            }
            const status = await window.Store.findCommonGroups(contact);
            if (status) {
                return contact.commonGroups.serialize();
            }
            return [];
        }, contactId);
        const chats = [];
        for (const group of commonGroups) {
            chats.push(group.id);
        }
        return chats;
    }

    /**
     * Force reset of connection state for the client
    */
    async resetState() {
        await this.pupPage.evaluate(() => {
            window.Store.AppState.phoneWatchdog.shiftTimer.forceRunNow();
        });
    }

    /**
     * Check if a given ID is registered in whatsapp
     * @param {string} id the whatsapp user's ID
     * @returns {Promise<Boolean>}
     */
    async isRegisteredUser(id) {
        return Boolean(await this.getNumberId(id));
    }

    /**
     * Get the registered WhatsApp ID for a number. 
     * Will return null if the number is not registered on WhatsApp.
     * @param {string} number Number or ID ("@c.us" will be automatically appended if not specified)
     * @returns {Promise<Object|null>}
     */
    async getNumberId(number) {
        if (!number.endsWith('@c.us')) {
            number += '@c.us';
        }

        return await this.pupPage.evaluate(async number => {
            const wid = window.Store.WidFactory.createWid(number);
            const result = await window.Store.QueryExist(wid);
            if (!result || result.wid === undefined) return null;
            return result.wid;
        }, number);
    }

    /**
     * Get the formatted number of a WhatsApp ID.
     * @param {string} number Number or ID
     * @returns {Promise<string>}
     */
    async getFormattedNumber(number) {
        if (!number.endsWith('@s.whatsapp.net')) number = number.replace('c.us', 's.whatsapp.net');
        if (!number.includes('@s.whatsapp.net')) number = `${number}@s.whatsapp.net`;

        return await this.pupPage.evaluate(async numberId => {
            return window.Store.NumberInfo.formattedPhoneNumber(numberId);
        }, number);
    }

    /**
     * Get the country code of a WhatsApp ID.
     * @param {string} number Number or ID
     * @returns {Promise<string>}
     */
    async getCountryCode(number) {
        number = number.replace(' ', '').replace('+', '').replace('@c.us', '');

        return await this.pupPage.evaluate(async numberId => {
            return window.Store.NumberInfo.findCC(numberId);
        }, number);
    }

    /**
     * Create a new group
     * @param {string} name group title
     * @param {Array<Contact|string>} participants an array of Contacts or contact IDs to add to the group
     * @returns {Object} createRes
     * @returns {string} createRes.gid - ID for the group that was just created
     * @returns {Object.<string,string>} createRes.missingParticipants - participants that were not added to the group. Keys represent the ID for participant that was not added and its value is a status code that represents the reason why participant could not be added. This is usually 403 if the user's privacy settings don't allow you to add them to groups.
     */
    async createGroup(name, participants) {
        if (!Array.isArray(participants) || participants.length == 0) {
            throw 'You need to add at least one other participant to the group';
        }

        if (participants.every(c => c instanceof Contact)) {
            participants = participants.map(c => c.id._serialized);
        }

        const createRes = await this.pupPage.evaluate(async (name, participantIds) => {
            const participantWIDs = participantIds.map(p => window.Store.WidFactory.createWid(p));
            return await window.Store.GroupUtils.createGroup(name, participantWIDs, 0);
        }, name, participants);

        const missingParticipants = createRes.participants.reduce(((missing, c) => {
            const id = c.wid._serialized;
            const statusCode = c.error ? c.error.toString() : '200';
            if (statusCode != 200) return Object.assign(missing, { [id]: statusCode });
            return missing;
        }), {});

        return { gid: createRes.wid, missingParticipants };
    }

    /**
     * Get all current Labels
     * @returns {Promise<Array<Label>>}
     */
    async getLabels() {
        const labels = await this.pupPage.evaluate(async () => {
            return window.WWebJS.getLabels();
        });

        return labels.map(data => new Label(this, data));
    }

    /**
     * Get Label instance by ID
     * @param {string} labelId
     * @returns {Promise<Label>}
     */
    async getLabelById(labelId) {
        const label = await this.pupPage.evaluate(async (labelId) => {
            return window.WWebJS.getLabel(labelId);
        }, labelId);

        return new Label(this, label);
    }

    /**
     * Get all Labels assigned to a chat 
     * @param {string} chatId
     * @returns {Promise<Array<Label>>}
     */
    async getChatLabels(chatId) {
        const labels = await this.pupPage.evaluate(async (chatId) => {
            return window.WWebJS.getChatLabels(chatId);
        }, chatId);

        return labels.map(data => new Label(this, data));
    }

    /**
     * Get all Chats for a specific Label
     * @param {string} labelId
     * @returns {Promise<Array<Chat>>}
     */
    async getChatsByLabelId(labelId) {
        const chatIds = await this.pupPage.evaluate(async (labelId) => {
            const label = window.Store.Label.get(labelId);
            const labelItems = label.labelItemCollection.getModelsArray();
            return labelItems.reduce((result, item) => {
                if (item.parentType === 'Chat') {
                    result.push(item.parentId);
                }
                return result;
            }, []);
        }, labelId);

        return Promise.all(chatIds.map(id => this.getChatById(id)));
    }

    /**
     * Gets all blocked contacts by host account
     * @returns {Promise<Array<Contact>>}
     */
    async getBlockedContacts() {
        const blockedContacts = await this.pupPage.evaluate(() => {
            let chatIds = window.Store.Blocklist.getModelsArray().map(a => a.id._serialized);
            return Promise.all(chatIds.map(id => window.WWebJS.getContact(id)));
        });

        return blockedContacts.map(contact => ContactFactory.create(this.client, contact));
    }

    /**
     * Sets the current user's profile picture.
     * @param {MessageMedia} media
     * @returns {Promise<boolean>} Returns true if the picture was properly updated.
     */
    async setProfilePicture(media, type = 'normal') {
        const success = await this.pupPage.evaluate(({ chatid, media, type }) => {
            return window.WWebJS.setPicture(chatid, media, type);
        }, { chatId: this.info.wid._serialized, media, type });

        return success;
    }

    /**
     * Deletes the current user's profile picture.
     * @returns {Promise<boolean>} Returns true if the picture was properly deleted.
     */
    async deleteProfilePicture() {
        const success = await this.pupPage.evaluate((chatid) => {
            return window.WWebJS.deletePicture(chatid);
        }, this.info.wid._serialized);

        return success;
    }

    /**
     * 
     * @param {string} chatId 
     * @param {object} options 
     * @returns {Promise<Boolean>}
     */
    async sendCall(chatId, options = {}) {
        if (!Array.isArray(chatId)) {
            chatId = [chatId]
        } else {
            chatId = chatId
        }

        const call = await Promise.all(chatId.map(async (id) => {
            return await this.pupPage.evaluate(({ id, options }) => {
                return window.WWebJS.call.offer(id, options)
            }, { id, options })
        }))

        return chatId.length
    }

    /**
     * 
     * @param {string} chatId
     * @returns {Promise<Boolean>}
     */
    async endCall(chatId) {
        const end = await this.pupPage.evaluate((chatId) => {
            return window.WWebJS.call.end(chatId)
        }, chatId)

        if (!end) return false
        return true
    }

    /**
     * 
     * @param {string} chatId
     * @returns {Promise<Boolean>}
     */
    async acceptCall(chatId) {
        const end = await this.pupPage.evaluate((chatId) => {
            return window.WWebJS.call.accept(chatId)
        }, chatId)

        if (!end) return false
        return true
    }

    /**
     * 
     * @param {string} chatId 
     * @returns {Promise<Boolean|String>}
     */
    async getLastSeen(chatId) {
        const chat = await this.pupPage.evaluate(async (chatId) => {
            return await window.WWebJS.chat.getLastSeen(chatId) || await window.WWebJS.getChatOnline(chatId);
        }, chatId);

        if (!chat) return false
        return Number(chat) > 2 ? Number(chat) : 'online'
    }
    
    /**
     * 
     * @returns 
     */
    getHost() {
        return this.pupPage.evaluate(() => {
            return WPP.whatsapp.Conn.attributes
        })
    }

    /**
     * 
     * @param {string} type light or dark 
     */
    async setTheme(type = 'dark') {
        await this.pupPage.evaluate(async (type) => {
            await window.Store.Theme.setTheme(type);
            return true
        }, type);
    }

    /**
     * 
     * @returns {string}
     */
    async getTheme() {
        const theme = await this.pupPage.evaluate(async () => {
            if (window.localStorage) {
                return await JSON.parse(JSON.stringify(window.localStorage))?.theme
            } else {
                return await window.Store.Theme.getTheme()
            }
        })

        if (!theme) return false
        return theme
    }

    /**
     * 
     * @param {string} chatId 
     * @returns 
     */
    async clearMessage(chatId) {
        return this.pupPage.evaluate(chatId => {
            return window.WWebJS.sendClearChat(chatId)
        }, chatId)
    }
    
    /**
     * 
     * @param {string} chatId - [phone_number]@c.us status sender id number
     * @param {string} statusId - false_status@broadcas_3A16xxx_123456@c.us sender status message id
     * @returns {Promise<void>}
     */
    async sendReadStatus(chatId, statusId) {
        await this.pupPage.evaluate(async ({ chatId, statusId }) => {
            const wid = window.Store.WidFactory.createWid(chatId)
            const statusStore = window.Store.StatusV3.get(wid)

            const status = statusStore?.msgs.get(statusId)
            await statusStore?.sendReadStatus(status, status?.mediaKeyTimestamp || status?.t)
        }, { chatId, statusId })
    }
    
    /**
     * 
     * @param {*} chatId 
     * @returns 
     */
    async getStories(chatId = this.info.wid._serialized) {
        const message = await this.pupPage.evaluate((chatId) => {
            if (chatId === 'all') {
                const status = window.Store.StatusV3.getModelsArray()

                if (!status) return undefined
                return status.map(a => a.serialize())
            } else {
                const Wid = window.Store.WidFactory.createWid(chatId)
                const status = window.Store.StatusV3.get(Wid)

                if (!status) return new Error('No Status Found!')
                const msg = status.serialize()
                return [msg]
            }
        }, chatId)

        if (!message === undefined) return undefined
        return message
    }
    
    /**
     * 
     * @param {string} name 
     * @returns 
     */
    async getContactByName(name) {
        let contact = (await this.getContacts()).filter(a => a.name && (a.name.toLowerCase().includes(name) || a.name.includes(name)))

        if (contact.length == 0) return null
        return contact
    }
    
    /**
     * 
     * @param {*} chatId 
     * @param {*} name 
     * @param {*} choices 
     * @param {*} options 
     * @returns 
     */
    async sendPoll(chatId, name, choices, options = {}) {
        let message = await this.pupPage.evaluate(async ({ chatId, name, choices, options }) => {
            let rawMessage = {
                waitForAck: true,
                sendSeen: true,
                type: 'poll_creation',
                pollName: name,
                pollOptions: choices.map((name, localId) => ({ name, localId })),
                pollEncKey: self.crypto.getRandomValues(new Uint8Array(32)),
                pollSelectableOptionsCount: options.selectableCount || 0,
                messageSecret: self.crypto.getRandomValues(new Uint8Array(32)),
            }

            await window.WWebJS.sendRawMessage(chatId, rawMessage, options)
        }, { chatId, name, choices, options })

        if (!message) return null
        return new Message(this, message)
    }
}

export default Client;
