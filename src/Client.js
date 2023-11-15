'use strict';

const EventEmitter = require('events');
const playwright = require('playwright-chromium');
const moduleRaid = require('@pedroslopez/moduleraid/moduleraid');
const colors = require('colors')
const fs = require('fs')
const Util = require('./util/Util');
const InterfaceController = require('./util/InterfaceController');
const { WhatsWebURL, DefaultOptions, Events, WAState } = require('./util/Constants');
const { ExposeStore, LoadUtils } = require('./util/Injected');
const ChatFactory = require('./factories/ChatFactory');
const ContactFactory = require('./factories/ContactFactory');
const WebCacheFactory = require('./webCache/WebCacheFactory');
const { ClientInfo, Message, MessageMedia, Contact, Location, Poll, GroupNotification, Label, Call, Buttons, List, Reaction } = require('./structures');
const LegacySessionAuth = require('./authStrategies/LegacySessionAuth');
const NoAuth = require('./authStrategies/NoAuth');
const LinkingMethod = require('./authStrategies/LinkingMethod');
const { kMaxLength } = require('buffer');

/**
 * Starting point for interacting with the WhatsApp Web API
 * @extends {EventEmitter}
 * @param {object} options - Client options
 * @param {AuthStrategy} options.authStrategy - Determines how to save and restore sessions. Will use LegacySessionAuth if options.session is set. Otherwise, NoAuth will be used.
 * @param {string} options.webVersion - The version of WhatsApp Web to use. Use options.webVersionCache to configure how the version is retrieved.
 * @param {object} options.webVersionCache - Determines how to retrieve the WhatsApp Web version. Defaults to a local cache (LocalWebCache) that falls back to latest if the requested version is not found.
 * @param {number} options.authTimeoutMs - Timeout for authentication selector in puppeteer
 * @param {object} options.puppeteer - Puppeteer launch options. View docs here: https://github.com/puppeteer/puppeteer/
 * @param {number} options.qrMaxRetries - How many times should the qrcode be refreshed before giving up
 * @param {string} options.restartOnAuthFail- @deprecated This option should be set directly on the LegacySessionAuth.
 * @param {object} options.session - @deprecated Only here for backwards-compatibility. You should move to using LocalAuth, or set the authStrategy to LegacySessionAuth explicitly. 
 * @param {number} options.takeoverOnConflict - If another whatsapp web session is detected (another browser), take over the session in the current browser
 * @param {number} options.takeoverTimeoutMs - How much time to wait before taking over the session
 * @param {string} options.userAgent - User agent to use in puppeteer
 * @param {string} options.ffmpegPath - Ffmpeg path to use when formating videos to webp while sending stickers 
 * @param {boolean} options.bypassCSP - Sets bypassing of page's Content-Security-Policy.
 * @param {object} options.proxyAuthentication - Proxy Authentication object.
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
 * @fires Client#group_membership_request
 */
class Client extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = Util.mergeDefault(DefaultOptions, options);

        if (!this.options.linkingMethod) {
            this.options.linkingMethod = new LinkingMethod({
                qr: {
                    maxRetries: this.options.qrMaxRetries,
                },
            });
        }

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

        this.mBrowser = null;
        this.mPage = null;

        Util.setFfmpegPath(this.options.ffmpegPath);
    }

    /**
     * Sets up events and requirements, kicks off authentication request
     */
    async initialize() {
        let [browser, page] = [null, null];

        await this.authStrategy.beforeBrowserInitialized();

        const playwrightOpts = this.options.playwright;
        if (playwrightOpts && playwrightOpts.wsEndpoint) {
            browser = await playwright.chromium.connect(playwrightOpts.wsEndpoint, {
                timeout: 0,
                ...playwrightOpts,
            });
            page = await context.newPage();
        } else {
            const browserArgs = [...(playwrightOpts.args || [])];
            if (!browserArgs.find((arg) => arg.includes("--user-agent"))) {
                browserArgs.push(`--user-agent=${this.options.userAgent}`);
            }

            const userDataDir = playwrightOpts.userDataDir || '.mywa_auth';

            const browser = await playwright.chromium.launchPersistentContext(userDataDir, {
                ...playwrightOpts,
                args: browserArgs,
                timeout: 0,
            });
            page = (await browser.pages())[0];
        }

        if (this.options.proxyAuthentication !== undefined) {
            await page.authenticate(this.options.proxyAuthentication);
        }

        if (this.options.userAgent) {
            await page.setExtraHTTPHeaders({
                "User-Agent": this.options.userAgent,
            });
        }
        if (this.options.bypassCSP) await page.setBypassCSP(true);


        this.mBrowser = browser;
        this.mPage = page;

        await this.authStrategy.afterBrowserInitialized();
        //await this.initWebVersionCache();

        await page.goto(WhatsWebURL, {
            waitUntil: 'load',
            timeout: 0,
            referer: 'https://whatsapp.com/'
        });
        /*
                await page.addScriptTag({
                    path: require.resolve("@amiruldev/wajs"),
                });
        
                await page.waitForFunction(() => window.WPP ?.isReady, {
                    timeout: 60000,
                });
        
                await page.evaluate(() => {
                    WPP.conn.joinWebBeta(true);
                    WPP.conn.setLimit('maxMediaSize', 16777216)
                    WPP.conn.setLimit('maxFileSize', 104857600)
                    WPP.conn.setLimit('maxShare', 100)
                    WPP.conn.setLimit('statusVideoMaxDuration', 120)
                    WPP.conn.setLimit('unlimitedPin', true);
                })*/

        //  await page.waitForSelector('#app > div > div > div._3HbCE', { timeout: this.options.authTimeoutMs });


        // new
        const getElementByXpath = (path) => {
            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        };

        let lastPercent = null,
            lastPercentMessage = null;
        let loads = false
        await page.exposeFunction('loadingScreen', async (percent, message) => {
            if (!loads) {
                this.emit(Events.LOADING_SCREEN, 'MywaJS', 'Please wait...')
                loads = true
            }
        });

        await page.exposeFunction('getElementByXpath', getElementByXpath);

        await page.evaluate(async (selectors) => {
            const observer = new MutationObserver(async () => {
                let progressBar = window.getElementByXpath(selectors.PROGRESS);
                let progressMessage = window.getElementByXpath(selectors.PROGRESS_MESSAGE);

                if (progressBar) {
                    window.loadingScreen(progressBar.value, progressMessage.innerText);
                }
            });

            observer.observe(document, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }, {
                PROGRESS: 'div.progress > progress',
                PROGRESS_MESSAGE: 'div.secondary'
            });

        const INTRO_IMG_SELECTOR = '[data-icon=\'search\']';
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

            // start login QR
            const loginQR = async () => {
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
                            }
                            // Listens to retry button, when found, click it
                            else if (mut.type === 'childList') {
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
            };
            // end loginQR

            // start login phone
            const loginPhone = async () => {
                const LINK_WITH_PHONE_BUTTON = "div._3rDmx div._2rQUO span._3iLTh";
                const PHONE_NUMBER_INPUT = "input.selectable-text";
                const NEXT_BUTTON = "div._1M6AF._3QJHf";
                const CODE_CONTAINER =
                    '[aria-details="link-device-phone-number-code-screen-instructions"]';
                const GENERATE_NEW_CODE_BUTTON = '[data-testid="popup-controls-ok"]';
                const LINK_WITH_PHONE_VIEW = "div._1x9Rv._3qC8O";

                await page.exposeFunction("codeChanged", async (code) => {
                    /**
                     * Emitted when a QR code is received
                     * @event Client#code
                     * @param {string} code Code
                     */
                    this.emit(Events.CODE_RECEIVED, code);
                });
                const clickOnLinkWithPhoneButton = async () => {
                    await page.waitForSelector(LINK_WITH_PHONE_BUTTON, {
                        timeout: 0,
                    });
                    await page.click(LINK_WITH_PHONE_BUTTON);
                    console.log("Click button login phone!!".yellow)
                };

                const typePhoneNumber = async () => {
                    await page.waitForSelector(PHONE_NUMBER_INPUT);
                    const inputValue = await page.$eval(
                        PHONE_NUMBER_INPUT,
                        (el) => el.value
                    );
                    await page.click(PHONE_NUMBER_INPUT);
                    for (let i = 0; i < inputValue.length; i++) {
                        await page.keyboard.press("Backspace");
                    }
                    await page.type(
                        PHONE_NUMBER_INPUT,
                        this.options.linkingMethod.phone.number
                    );
                    console.log(`Input your number!!`.yellow)
                };

                await clickOnLinkWithPhoneButton();
                await typePhoneNumber();
                await page.click(NEXT_BUTTON);
                console.log('Generate login code!!'.green)
                await page.evaluate(
                    async function (selectors) {
                        function waitForElementToExist(selector, timeout = 60000) {
                            return new Promise((resolve, reject) => {
                                if (document.querySelector(selector)) {
                                    return resolve(document.querySelector(selector));
                                }

                                const observer = new MutationObserver(() => {
                                    if (document.querySelector(selector)) {
                                        resolve(document.querySelector(selector));
                                        observer.disconnect();
                                    }
                                });

                                observer.observe(document.body, {
                                    subtree: true,
                                    childList: true,
                                });

                                if (timeout > 0) {
                                    setTimeout(() => {
                                        reject(
                                            new Error(
                                                `waitForElementToExist: ${selector} not found in time`
                                            )
                                        );
                                    }, timeout);
                                }
                            });
                        }

                        await waitForElementToExist(selectors.CODE_CONTAINER);

                        const getCode = () => {
                            const codeContainer = document.querySelector(
                                selectors.CODE_CONTAINER
                            );
                            const code = Array.from(codeContainer.children)[0];

                            const cells = Array.from(code.children);
                            return cells.map((cell) => cell.textContent).join("");
                        };
                        let code = getCode();
                        window.codeChanged(code);

                        const entirePageObserver = new MutationObserver(() => {
                            const generateNewCodeButton = document.querySelector(
                                selectors.GENERATE_NEW_CODE_BUTTON
                            );
                            if (generateNewCodeButton) {
                                generateNewCodeButton.click();
                                return;
                            }
                        });
                        entirePageObserver.observe(document, {
                            subtree: true,
                            childList: true,
                        });

                        const linkWithPhoneView = document.querySelector(
                            selectors.LINK_WITH_PHONE_VIEW
                        );
                        const linkWithPhoneViewObserver = new MutationObserver(() => {
                            const newCode = getCode();
                            if (newCode !== code) {
                                window.codeChanged(newCode);
                                code = newCode;
                            }
                        });
                        linkWithPhoneViewObserver.observe(linkWithPhoneView, {
                            subtree: true,
                            childList: true,
                        });
                    },
                    {
                        CODE_CONTAINER,
                        GENERATE_NEW_CODE_BUTTON,
                        LINK_WITH_PHONE_VIEW,
                    }
                );
            };
            // end login phone

            // login method
            const { linkingMethod } = this.options;
            //console.log(linkingMethod)
            if (linkingMethod.isQR()) {
                await loginQR();
                setTimeout(function () {
                    console.log('PLEASE READ!! For the first time logging in, after waiting a few seconds, please restart so the session can connect!!'.cyan)
                }, 15000)
            } else {
                await loginPhone();
                setTimeout(function () {
                    console.log('PLEASE READ!! For the first time logging in, after waiting a few seconds, please restart so the session can connect!!'.cyan)
                }, 15000)
            }

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

        await page.evaluate(() => {
            /**
             * Helper function that compares between two WWeb versions. Its purpose is to help the developer to choose the correct code implementation depending on the comparison value and the WWeb version.
             * @param {string} lOperand The left operand for the WWeb version string to compare with
             * @param {string} operator The comparison operator
             * @param {string} rOperand The right operand for the WWeb version string to compare with
             * @returns {boolean} Boolean value that indicates the result of the comparison
             */
            window.compareWwebVersions = (lOperand, operator, rOperand) => {
                if (!['>', '>=', '<', '<=', '='].includes(operator)) {
                    throw new class _ extends Error {
                        constructor(m) { super(m); this.name = 'CompareWwebVersionsError'; }
                    }('Invalid comparison operator is provided');

                }
                if (typeof lOperand !== 'string' || typeof rOperand !== 'string') {
                    throw new class _ extends Error {
                        constructor(m) { super(m); this.name = 'CompareWwebVersionsError'; }
                    }('A non-string WWeb version type is provided');
                }

                lOperand = lOperand.replace(/-beta$/, '');
                rOperand = rOperand.replace(/-beta$/, '');

                while (lOperand.length !== rOperand.length) {
                    lOperand.length > rOperand.length
                        ? rOperand = rOperand.concat('0')
                        : lOperand = lOperand.concat('0');
                }

                lOperand = Number(lOperand.replace(/\./g, ''));
                rOperand = Number(rOperand.replace(/\./g, ''));

                return (
                    operator === '>' ? lOperand > rOperand :
                        operator === '>=' ? lOperand >= rOperand :
                            operator === '<' ? lOperand < rOperand :
                                operator === '<=' ? lOperand <= rOperand :
                                    operator === '=' ? lOperand === rOperand :
                                        false
                );
            };
        });

        await page.evaluate(ExposeStore, moduleRaid.toString());
        /*
        const inject = async () => {
            await page.evaluate(ExposeStore, moduleRaid.toString()).catch(async error => {
                if (error.message.includes('call')) {
                    await inject();
                }
            });
        };
        await inject();*/
        const authEventPayload = await this.authStrategy.getAuthEventPayload();

        /**
         * Emitted when authentication is successful
         * @event Client#authenticated
         */
        this.emit(Events.AUTHENTICATED, authEventPayload);

        // Check window.Store Injection
        await page.waitForFunction('window.Store != undefined');

        await page.evaluate(async () => {
            // safely unregister service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        });

        //Load util functions (serializers, helper functions)
        await page.evaluate(LoadUtils);

        const divElement = await page.$('div._3RpB9');

        if (divElement) {
            await divElement.$eval('h1', (h1) => {
                h1.innerText = 'MywaJS 2023';
            });
        }

        // Mencari elemen dengan selector
        const element = await page.$('div._20Tzn');

        // Mengubah isi teks menggunakan page.$eval
        await page.$eval('div._20Tzn', (div) => {
            div.innerText = 'Made by Amirul Dev • WA: 085157489446';
        });

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
                if (['add', 'invite', 'linked_group_join'].includes(msg.subtype)) {
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
                } else if (msg.subtype === 'created_membership_requests') {
                    /**
                     * Emitted when some user requested to join the group
                     * that has the membership approval mode turned on
                     * @event Client#group_membership_request
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     * @param {string} notification.chatId The group ID the request was made for
                     * @param {string} notification.author The user ID that made a request
                     * @param {number} notification.timestamp The timestamp the request was made at
                     */
                    this.emit(Events.GROUP_MEMBERSHIP_REQUEST, notification);
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
             * the group participants changes their phone number.
             */
            const isParticipant = msg.type === 'gp2' && msg.subtype === 'modify';

            /**
             * The event notification that is received when one of
             * the contacts changes their phone number.
             */
            const isContact = msg.type === 'notification_template' && msg.subtype === 'change_number';

            if (isParticipant || isContact) {
                /** @type {GroupNotification} object does not provide enough information about this event, so a @type {Message} object is used. */
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

        await page.exposeFunction('onChatUnreadCountEvent', async (data) => {
            const chat = await this.getChatById(data.id);

            /**
             * Emitted when the chat unread count changes
             */
            this.emit(Events.UNREAD_COUNT, chat);
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
                        this.mPage.evaluate(() => window.Store.AppState.takeover());
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

        await page.exposeFunction('onRemoveChatEvent', async (chat) => {
            const _chat = await this.getChatById(chat.id);

            /**
             * Emitted when a chat is removed
             * @event Client#chat_removed
             * @param {Chat} chat
             */
            this.emit(Events.CHAT_REMOVED, _chat);
        });

        await page.exposeFunction('onArchiveChatEvent', async (chat, currState, prevState) => {
            const _chat = await this.getChatById(chat.id);

            /**
             * Emitted when a chat is archived/unarchived
             * @event Client#chat_archived
             * @param {Chat} chat
             * @param {boolean} currState
             * @param {boolean} prevState
             */
            this.emit(Events.CHAT_ARCHIVED, _chat, currState, prevState);
        });

        await page.exposeFunction('onEditMessageEvent', (msg, newBody, prevBody) => {

            if (msg.type === 'revoked') {
                return;
            }
            /**
             * Emitted when messages are edited
             * @event Client#message_edit
             * @param {Message} message
             * @param {string} newBody
             * @param {string} prevBody
             */
            this.emit(Events.MESSAGE_EDIT, new Message(this, msg), newBody, prevBody);
        });

        await page.evaluate(() => {
            window.Store.Msg.on('change', (msg) => { window.onChangeMessageEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('change:type', (msg) => { window.onChangeMessageTypeEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('change:ack', (msg, ack) => { window.onMessageAckEvent(window.WWebJS.getMessageModel(msg), ack); });
            window.Store.Msg.on('change:isUnsentMedia', (msg, unsent) => { if (msg.id.fromMe && !unsent) window.onMessageMediaUploadedEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('remove', (msg) => { if (msg.isNewMsg) window.onRemoveMessageEvent(window.WWebJS.getMessageModel(msg)); });
            window.Store.Msg.on('change:body', (msg, newBody, prevBody) => { window.onEditMessageEvent(window.WWebJS.getMessageModel(msg), newBody, prevBody); });
            window.Store.AppState.on('change:state', (_AppState, state) => { window.onAppStateChangedEvent(state); });
            window.Store.Conn.on('change:battery', (state) => { window.onBatteryStateChangedEvent(state); });
            window.Store.Call.on('add', (call) => { window.onIncomingCall(call); });
            window.Store.Chat.on('remove', async (chat) => { window.onRemoveChatEvent(await window.WWebJS.getChatModel(chat)); });
            window.Store.Chat.on('change:archive', async (chat, currState, prevState) => { window.onArchiveChatEvent(await window.WWebJS.getChatModel(chat), currState, prevState); });
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
            window.Store.Chat.on('change:unreadCount', (chat) => { window.onChatUnreadCountEvent(chat); });

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
        this.mPage.on('framenavigated', async () => {
            const appState = await this.getState();
            if (!appState || appState === WAState.PAIRING) {
                await this.authStrategy.disconnect();
                this.emit(Events.DISCONNECTED, 'NAVIGATION');
                await this.destroy();
            }
        });
    }

    async initWebVersionCache() {
        const { type: webCacheType, ...webCacheOptions } = this.options.webVersionCache;
        const webCache = WebCacheFactory.createWebCache(webCacheType, webCacheOptions);

        const requestedVersion = this.options.webVersion;
        const versionContent = await webCache.resolve(requestedVersion);

        if (versionContent) {
            await this.mPage.setRequestInterception(true);
            this.mPage.on('request', async (req) => {
                if (req.url() === WhatsWebURL) {
                    req.respond({
                        status: 200,
                        contentType: 'text/html',
                        body: versionContent
                    });
                } else {
                    req.continue();
                }
            });
        } else {
            this.mPage.on('response', async (res) => {
                if (res.ok() && res.url() === WhatsWebURL) {
                    await webCache.persist(await res.text());
                }
            });
        }
    }

    /**
     * Closes the client
     */
    async destroy() {
        await this.mBrowser.close();
        await this.authStrategy.destroy();
    }

    /* logout session */
    async logout() {
        await this.mPage.evaluate(() => {
            return window.Store.AppState.logout();
        });
        await this.mBrowser.close();

        let maxDelay = 0;
        while (this.mBrowser.isConnected() && (maxDelay < 10)) { // waits a maximum of 1 second before calling the AuthStrategy
            await new Promise(resolve => setTimeout(resolve, 100));
            maxDelay++;
        }

        await this.authStrategy.logout();
    }

    /* get detail wweb */
    async getWWeb() {
        return await this.mPage.evaluate(() => {
            var res = {
                version: window.Debug.VERSION,
                desktop_beta: window.Debug.DESKTOP_BETA,
                id: window.Debug.BUILD_ID,
            };
            return res;
        });
    }

    /* read chat */
    async sendSeen(chatId) {
        const result = await this.mPage.evaluate(async (chatId) => {
            return window.WWebJS.sendSeen(chatId);

        }, chatId);
        return result;
    }

    /* send message */
    async sendMessage(chatId, content, options = {}) {
        let internalOptions = {
            linkPreview: options.linkPreview,
            sendAudioAsVoice: options.ptt,
            sendVideoAsGif: options.gifPlayBack,
            sendMediaAsSticker: options.asSticker,
            sendMediaAsDocument: options.asDocument,
            caption: options.caption,
            quotedMessageId: options.quoted ?.id ?
                options.quoted._serialized || options.quoted.id._serialized : options.quoted,
            parseVCards: options.parseVCards === false ? false : true,
            mentionedJidList: Array.isArray(options.mentions) ?
                options.mentions.map((contact) =>
                    contact ?.id ? contact ?.id ?._serialized : contact
                ) : [],
            extraOptions: options.extra,
        };

        if (options.caption) internalOptions.caption = options.caption;
        const sendSeen =
            typeof options.sendSeen === "undefined" ? true : options.sendSeen;

        if (
            Buffer.isBuffer(content) ||
            /^[a-zA-Z0-9+/]*={0,2}$/i.test(content) ||
            /^data:.*?\/.*?;base64,/i.test(content) ||
            /^https?:\/\//.test(content) ||
            fs.existsSync(content)
        ) {
            let media = await Util.getFile(content);
            let ex = typeof media === "undefined" ? ".bin" : media.ext;
            if (!options.mimetype && ex === ".bin") {
                content = content;
            } else {
                internalOptions.attachment = {
                    mimetype: options.mimetype ? options.mimetype : media.mime,
                    data: media ?.data ?.toString("base64") || Util.bufferToBase64(media.data),
                    filename: options.fileName ?
                        options.fileName : Util.getRandom(media.ext),
                    filesize: options.fileSize ? options.fileSize : media.size,
                };
                content = "";
            }
        } else if (content instanceof MessageMedia) {
            internalOptions.attachment = content;
            content = "";
        } else if (options.media instanceof MessageMedia) {
            internalOptions.attachment = options.media;
            internalOptions.caption = content;
            content = "";
        } else if (content instanceof Location) {
            internalOptions.location = content;
            content = "";
        } else if (content instanceof Contact) {
            internalOptions.contactCard = content.id ?
                content.id._serialized :
                content;
            content = "";
        } else if (
            Array.isArray(content) &&
            content.length > 0 &&
            content[0] instanceof Contact
        ) {
            internalOptions.contactCardList = content.map((contact) =>
                contact.id ? contact.id._serialized : contact
            );
            content = "";
        } else if (content instanceof Buttons) {
            if (content.type !== "chat") {
                internalOptions.attachment = content.body;
            }
            internalOptions.buttons = content;
            content = "";
        } else if (content instanceof List) {
            internalOptions.list = content;
            content = "";
        }

        if (internalOptions.sendMediaAsSticker && internalOptions.attachment) {
            internalOptions.attachment = await Util.formatToWebpSticker(
                internalOptions.attachment, {
                    packId: options ?.packId ? options.packId : global ?.Exif ?.packId,
                    packName: options ?.packName ?
                        options.packName : global ?.Exif ?.packName,
                    packPublish: options ?.packPublish ?
                        options.packPublish : global ?.Exif ?.packPublish,
                    packEmail: options ?.packEmail ?
                        options.packEmail : global ?.Exif ?.packEmail,
                    packWebsite: options ?.packWebsite ?
                        options.packWebsite : global ?.Exif ?.packWebsite,
                    androidApp: options ?.androidApp ?
                        options.androidApp : global ?.Exif ?.androidApp,
                    iOSApp: options ?.iOSApp ? options.iOSApp : global ?.Exif ?.iOSApp,
                    categories: options ?.categories ?
                        options.categories : global ?.Exif ?.categories,
                    isAvatar: options ?.isAvatar ?
                        options.isAvatar : global ?.Exif ?.isAvatar,
                },
                this.mPage
            );
        }

        if (internalOptions.attachment ?.filesize > 42428800) {
            let startDivision = 2;
            let middle = internalOptions.attachment.data.length / startDivision;
            let currentIndex = 0;


            while (middle > (1024 * 1024 * 50)) {
                startDivision += 1;
                middle = Math.floor(internalOptions.attachment.data.length / startDivision);
            }

            const randomId = Util.generateHash(32);

            while (currentIndex < internalOptions.attachment.data.length) {
                let chunkPiece = middle;
                if (currentIndex + middle > internalOptions.attachment.data.length) {
                    chunkPiece = internalOptions.attachment.data.length - currentIndex;
                }
                await this.mPage.evaluate(async ({
                    chatId,
                    chunk,
                    randomId
                }) => {
                    if (chunk && window[`mediaChunk_${randomId}`]) {
                        window[`mediaChunk_${randomId}`] += chunk;
                    } else {
                        window[`mediaChunk_${randomId}`] = chunk;
                    }
                }, {
                        chatId,
                        chunk: internalOptions.attachment.data.substring(currentIndex, currentIndex + chunkPiece),
                        randomId
                    });
                currentIndex += chunkPiece;

            }

            internalOptions.attachment = new MessageMedia(internalOptions.attachment.mimetype, `mediaChunk_${randomId}`, internalOptions.attachment.filename, internalOptions.attachment.filesize);
        }

        const newMessage = await this.mPage.evaluate(
            async ({
                chatId,
                message,
                options,
                sendSeen
            }) => {
                const chatWid = window.Store.WidFactory.createWid(chatId);
                const chat = await window.Store.Chat.find(chatWid);

                if (sendSeen) {
                    window.WWebJS.sendSeen(chatId);
                }

                if (options ?.attachment ?.data ?.startsWith('mediaChunk')) {
                    options.attachment.data = window[options.attachment.data];
                    delete window[options.attachment.data];
                }


                const msg = await window.WWebJS.sendMessage(
                    chat,
                    message,
                    options,
                    sendSeen
                );
                return msg.serialize();
            }, {
                chatId,
                message: content,
                options: internalOptions,
                sendSeen,
            }
        );

        if (newMessage) return new Message(this, newMessage);
    }

    /* search messages */
    async searchMessages(query, options = {}) {
        const messages = await this.mPage.evaluate(
            async ({ query, page, count, remote }) => {
                const { messages } = await window.Store.Msg.search(
                    query,
                    page,
                    count,
                    remote
                );
                return messages.map((msg) => window.WWebJS.getMessageModel(msg));
            },
            {
                query,
                page: options.page,
                count: options.limit,
                remote: options.chatId
            }
        );

        return messages.map((msg) => new Message(this, msg));
    }

    /* get all chats */
    async getChats() {
        let chats = await this.mPage.evaluate(async () => {
            return await window.WWebJS.getChats();
        });

        return chats.map((chat) => ChatFactory.create(this, chat));
    }

    /* get chat from id */
    async getChatById(chatId) {
        let chat = await this.mPage.evaluate(async (chatId) => {
            return await window.WWebJS.getChat(chatId);
        }, chatId);

        return ChatFactory.create(this, chat);
    }

    /* get all contact */
    async getContacts() {
        let contacts = await this.mPage.evaluate(() => {
            return window.WWebJS.getContacts();
        });

        return contacts.map((contact) => ContactFactory.create(this, contact));
    }

    /* get contact from id */
    async getContactById(contactId) {
        let contact = await this.mPage.evaluate((contactId) => {
            return window.WWebJS.getContact(contactId);
        }, contactId);

        return ContactFactory.create(this, contact);
    }

    /* get message from id */
    async getMessageById(messageId) {
        const msg = await this.mPage.evaluate(async (messageId) => {
            let msg = window.Store.Msg.get(messageId);
            if (msg) return window.WWebJS.getMessageModel(msg);

            const params = messageId.split("_");
            if (params.length !== 3)
                throw new Error("Invalid serialized message id specified");

            let messagesObject = await window.Store.Msg.getMessagesById([messageId]);
            if (messagesObject && messagesObject.messages.length)
                msg = messagesObject.messages[0];

            if (msg) return window.WWebJS.getMessageModel(msg);
        }, messageId);

        if (msg) return new Message(this, msg);
        return null;
    }

    /* get invite info */
    async getInviteInfo(inviteCode) {
        return await this.mPage.evaluate((inviteCode) => {
            return window.Store.GroupInvite.queryGroupInvite(inviteCode);
        }, inviteCode);
    }

    /* accept invite */
    async acceptInvite(inviteCode) {
        const res = await this.mPage.evaluate(async (inviteCode) => {
            return await window.Store.GroupInvite.joinGroupViaInvite(inviteCode);
        }, inviteCode);

        return res.gid._serialized;
    }

    /* accept v4 invite */
    async acceptV4Invite(inviteInfo) {
        if (!inviteInfo.inviteCode)
            throw "Invalid invite code, try passing the message.inviteV4 object";
        if (inviteInfo.inviteCodeExp == 0) throw "Expired invite code";
        return this.mPage.evaluate(async (inviteInfo) => {
            let { groupId, fromId, inviteCode, inviteCodeExp } = inviteInfo;
            let userWid = window.Store.WidFactory.createWid(fromId);
            return await window.Store.GroupInviteV4.joinGroupViaInviteV4(
                inviteCode,
                String(inviteCodeExp),
                groupId,
                userWid
            );
        }, inviteInfo);
    }

    /* set status */
    async setStatus(status) {
        await this.mPage.evaluate(async (status) => {
            return await window.Store.StatusUtils.setMyStatus(status);
        }, status);
    }

    /* change name */
    async setName(displayName) {
        const couldSet = await this.mPage.evaluate(async (displayName) => {
            if (!window.Store.Conn.canSetMyPushname()) return false;

            if (window.Store.MDBackend) {
                // TODO
                return false;
            } else {
                const res = await window.Store.Wap.setPushname(displayName);
                return !res.status || res.status === 200;
            }
        }, displayName);

        return couldSet;
    }

    /* get state */
    async getState() {
        return await this.mPage.evaluate(() => {
            if (!window.Store) return null;
            return window.Store.AppState.state;
        });
    }

    /* presence online */
    async sendPresenceAvailable() {
        return await this.mPage.evaluate(() => {
            return window.Store.PresenceUtils.sendPresenceAvailable();
        });
    }

    /* presence unavailable */
    async sendPresenceUnavailable() {
        return await this.mPage.evaluate(() => {
            return window.Store.PresenceUtils.sendPresenceUnavailable();
        });
    }

    /* archive chat */
    async archiveChat(chatId) {
        return await this.mPage.evaluate(async (chatId) => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.archiveChat(chat, true);
            return true;
        }, chatId);
    }

    /* unarchive chat */
    async unarchiveChat(chatId) {
        return await this.mPage.evaluate(async (chatId) => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.archiveChat(chat, false);
            return false;
        }, chatId);
    }

    /* pin chat */
    async pinChat(chatId) {
        return this.mPage.evaluate(async (chatId) => {
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

    /* unpin chat */
    async unpinChat(chatId) {
        return this.mPage.evaluate(async (chatId) => {
            let chat = window.Store.Chat.get(chatId);
            if (!chat.pin) {
                return false;
            }
            await window.Store.Cmd.pinChat(chat, false);
            return false;
        }, chatId);
    }

    /* mute chat */
    async muteChat(chatId, unmuteDate) {
        unmuteDate = unmuteDate ? unmuteDate.getTime() / 1000 : -1;
        await this.mPage.evaluate(
            async ({ chatId, timestamp }) => {
                let chat = await window.Store.Chat.get(chatId);
                await chat.mute.mute({ expiration: timestamp, sendDevice: !0 });
            },
            {
                chatId,
                timestamp: unmuteDate || -1
            }
        );
    }

    /* unmute chat */
    async unmuteChat(chatId) {
        await this.mPage.evaluate(async (chatId) => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.muteChat(chat, false);
        }, chatId);
    }

    /* mark chat unread */
    async markChatUnread(chatId) {
        await this.mPage.evaluate(async (chatId) => {
            let chat = await window.Store.Chat.get(chatId);
            await window.Store.Cmd.markChatUnread(chat, true);
        }, chatId);
    }

    /* get profile pict */
    async getProfilePict(contactId) {
        const profilePic = await this.mPage.evaluate(async (contactId) => {
            try {
                const chatWid = window.Store.WidFactory.createWid(contactId);
                return await window.Store.ProfilePic.profilePicFind(chatWid);
            } catch (err) {
                if (err.name === "ServerStatusCodeError") return undefined;
                throw err;
            }
        }, contactId);

        return profilePic ? profilePic.eurl : undefined;
    }

    /* get common groups */
    async getCommonGroups(contactId) {
        const commonGroups = await this.mPage.evaluate(async (contactId) => {
            let contact = window.Store.Contact.get(contactId);
            if (!contact) {
                const wid = window.Store.WidFactory.createUserWid(contactId);
                const chatConstructor = window.Store.Contact.getModelsArray().find(
                    (c) => !c.isGroup
                ).constructor;
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

    /* reset state */
    async resetState() {
        await this.mPage.evaluate(() => {
            window.Store.AppState.phoneWatchdog.shiftTimer.forceRunNow();
        });
    }

    /* is registered wa */
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

        return await this.mPage.evaluate(async number => {
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

        return await this.mPage.evaluate(async numberId => {
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

        return await this.mPage.evaluate(async numberId => {
            return window.Store.NumberInfo.findCC(numberId);
        }, number);
    }

    /* create group */
    async createGroup(title, participants = [], options = {}) {
        !Array.isArray(participants) && (participants = [participants]);
        participants.map(p => (p instanceof Contact) ? p.id._serialized : p);

        return await this.mPage.evaluate(async ({ title, participants, options }) => {
            const { messageTimer = 0, parentGroupId, autoSendInviteV4 = true, comment = '' } = options;
            const participantData = {}, participantWids = [], failedParticipants = [];
            let createGroupResult, parentGroupWid;

            const addParticipantResultCodes = {
                default: 'An unknown error occupied while adding a participant',
                200: 'The participant was added successfully',
                403: 'The participant can be added by sending private invitation only',
                404: 'The phone number is not registered on WhatsApp'
            };

            for (const participant of participants) {
                const pWid = window.Store.WidFactory.createWid(participant);
                if ((await window.Store.QueryExist(pWid)) ?.wid) participantWids.push(pWid);
                else failedParticipants.push(participant);
            }

            parentGroupId && (parentGroupWid = window.Store.WidFactory.createWid(parentGroupId));

            try {
                createGroupResult = await window.Store.GroupUtils.createGroup(
                    title,
                    participantWids,
                    messageTimer,
                    parentGroupWid
                );
            } catch (err) {
                return 'CreateGroupError: An unknown error occupied while creating a group';
            }

            for (const participant of createGroupResult.participants) {
                let isInviteV4Sent = false;
                const participantId = participant.wid._serialized;
                const statusCode = participant.error ?? 200;

                if (autoSendInviteV4 && statusCode === 403) {
                    window.Store.ContactCollection.gadd(participant.wid, { silent: true });
                    const addParticipantResult = await window.Store.GroupInviteV4.sendGroupInviteMessage(
                        await window.Store.Chat.find(participant.wid),
                        createGroupResult.wid._serialized,
                        createGroupResult.subject,
                        participant.invite_code,
                        participant.invite_code_exp,
                        comment,
                        await window.WWebJS.getProfilePicThumbToBase64(createGroupResult.wid)
                    );
                    isInviteV4Sent = window.compareWwebVersions(window.Debug.VERSION, '<', '2.2335.6')
                        ? addParticipantResult === 'OK'
                        : addParticipantResult.messageSendResult === 'OK';
                }

                participantData[participantId] = {
                    statusCode: statusCode,
                    message: addParticipantResultCodes[statusCode] || addParticipantResultCodes.default,
                    isGroupCreator: participant.type === 'superadmin',
                    isInviteV4Sent: isInviteV4Sent
                };
            }

            for (const f of failedParticipants) {
                participantData[f] = {
                    statusCode: 404,
                    message: addParticipantResultCodes[404],
                    isGroupCreator: false,
                    isInviteV4Sent: false
                };
            }

            return { title: title, gid: createGroupResult.wid, participants: participantData };
        }, { title, participants, options });
    }

    /**
     * Get all current Labels
     * @returns {Promise<Array<Label>>}
     */
    async getLabels() {
        const labels = await this.mPage.evaluate(async () => {
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
        const label = await this.mPage.evaluate(async (labelId) => {
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
        const labels = await this.mPage.evaluate(async (chatId) => {
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
        const chatIds = await this.mPage.evaluate(async (labelId) => {
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
        const blockedContacts = await this.mPage.evaluate(() => {
            let chatIds = window.Store.Blocklist.getModelsArray().map(a => a.id._serialized);
            return Promise.all(chatIds.map(id => window.WWebJS.getContact(id)));
        });

        return blockedContacts.map(contact => ContactFactory.create(this.client, contact));
    }

    /**
     * Deletes the current user's profile picture.
     * @returns {Promise<boolean>} Returns true if the picture was properly deleted.
     */
    async deleteProfilePicture() {
        const success = await this.mPage.evaluate((chatid) => {
            return window.WWebJS.deletePicture(chatid);
        }, this.info.wid._serialized);

        return success;
    }

    /**
     * Change labels in chats
     * @param {Array<number|string>} labelIds
     * @param {Array<string>} chatIds
     * @returns {Promise<void>}
     */
    async addOrRemoveLabels(labelIds, chatIds) {
        return this.mPage.evaluate(
            async ({ labelIds, chatIds }) => {
                if (["smba", "smbi"].indexOf(window.Store.Conn.platform) === -1) {
                    throw "[LT01] Only Whatsapp business";
                }
                const labels = window.WWebJS.getLabels().filter(
                    (e) => labelIds.find((l) => l == e.id) !== undefined
                );
                const chats = window.Store.Chat.filter((e) =>
                    chatIds.includes(e.id._serialized)
                );

                let actions = labels.map((label) => ({ id: label.id, type: "add" }));

                chats.forEach((chat) => {
                    (chat.labels || []).forEach((n) => {
                        if (!actions.find((e) => e.id == n)) {
                            actions.push({ id: n, type: "remove" });
                        }
                    });
                });

                return await window.Store.Label.addOrRemoveLabels(actions, chats);
            },
            {
                labelIds,
                chatIds
            }
        );
    }

    /**
     * An object that handles the information about the group membership request
     * @typedef {Object} GroupMembershipRequest
     * @property {Object} id The wid of a user who requests to enter the group
     * @property {Object} addedBy The wid of a user who created that request
     * @property {Object|null} parentGroupId The wid of a community parent group to which the current group is linked
     * @property {string} requestMethod The method used to create the request: NonAdminAdd/InviteLink/LinkedGroupJoin
     * @property {number} t The timestamp the request was created at
     */

    /**
     * Gets an array of membership requests
     * @param {string} groupId The ID of a group to get membership requests for
     * @returns {Promise<Array<GroupMembershipRequest>>} An array of membership requests
     */
    async getRequestMembers(groupId) {
        return await this.mPage.evaluate(async (gropId) => {
            const groupWid = window.Store.WidFactory.createWid(gropId);
            return await window.Store.MembershipRequestUtils.getMembershipApprovalRequests(
                groupWid
            );
        }, groupId);
    }

    /**
     * Approves membership requests if any
     * @param {string} groupId The group ID to get the membership request for
     * @param {MembershipRequestActionOptions} options Options for performing a membership request action
     * @returns {Promise<Array<MembershipRequestActionResult>>} Returns an array of requester IDs whose membership requests were approved and an error for each requester, if any occurred during the operation. If there are no requests, an empty array will be returned
     */
    async approveMember(groupId, options = {}) {
        return await this.mPage.evaluate(
            async ({ groupId, options }) => {
                const { requesterIds = null, sleep = [250, 500] } = options;
                return await window.WWebJS.membershipRequestAction(
                    groupId,
                    "Approve",
                    requesterIds,
                    sleep
                );
            },
            {
                groupId,
                options
            }
        );
    }

    /**
     * Rejects membership requests if any
     * @param {string} groupId The group ID to get the membership request for
     * @param {MembershipRequestActionOptions} options Options for performing a membership request action
     * @returns {Promise<Array<MembershipRequestActionResult>>} Returns an array of requester IDs whose membership requests were rejected and an error for each requester, if any occurred during the operation. If there are no requests, an empty array will be returned
     */
    async rejectMember(groupId, options = {}) {
        return await this.mPage.evaluate(
            async ({ groupId, options }) => {
                const { requesterIds = null, sleep = [250, 500] } = options;
                return await window.WWebJS.membershipRequestAction(
                    groupId,
                    "Reject",
                    requesterIds,
                    sleep
                );
            },
            {
                groupId,
                options
            }
        );
    }

    /**
     * Settingautoload download audio
     * @param {boolean} flag true/false
     */
    async setAutoDownloadAudio(flag) {
        await this.mPage.evaluate(async flag => {
            const autoDownload = window.Store.Settings.getAutoDownloadAudio();
            if (autoDownload === flag) {
                return flag;
            }
            await window.Store.Settings.setAutoDownloadAudio(flag);
            return flag;
        }, flag);
    }

    /**
     * Settingautoload download documents
     * @param {boolean} flag true/false
     */
    async setAutoDownloadDocuments(flag) {
        await this.mPage.evaluate(async flag => {
            const autoDownload = window.Store.Settings.getAutoDownloadDocuments();
            if (autoDownload === flag) {
                return flag;
            }
            await window.Store.Settings.setAutoDownloadDocuments(flag);
            return flag;
        }, flag);
    }

    /**
     * Settingautoload download photos
     * @param {boolean} flag true/false
     */
    async setAutoDownloadPhotos(flag) {
        await this.mPage.evaluate(async flag => {
            const autoDownload = window.Store.Settings.getAutoDownloadPhotos();
            if (autoDownload === flag) {
                return flag;
            }
            await window.Store.Settings.setAutoDownloadPhotos(flag);
            return flag;
        }, flag);
    }

    /**
     * Settingautoload download videos
     * @param {boolean} flag true/false
     */
    async setAutoDownloadVideos(flag) {
        await this.mPage.evaluate(async flag => {
            const autoDownload = window.Store.Settings.getAutoDownloadVideos();
            if (autoDownload === flag) {
                return flag;
            }
            await window.Store.Settings.setAutoDownloadVideos(flag);
            return flag;
        }, flag);
    }


    /* NEW FUNCTION */

    /* getname */
    async getName(jid) {
        const contact = await this.getContactById(jid);
        return (
            contact.name || contact.pushname || contact.shortName || contact.number
        );
    }

    /* group metadata */
    async groupMetadata(chatId) {
        let chat = await this.mPage.evaluate(async (chatId) => {
            let chatWid = await window.Store.WidFactory.createWid(chatId);
            let chat = await window.Store.GroupMetadata.find(chatWid);

            return chat.serialize();
        }, chatId);

        if (!chat) return false;
        return chat;
    }

    /* screenshot wa */
    async myPage() {
        await this.mPage.setViewportSize({
            width: 961,
            height: 2000
        })
        let media = await this.mPage.screenshot()
        let upload = await Util.upload(media)
        return upload.url
    }

    /* parse mention */
    async parseMention(text) {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@c.us') || []
    }

    /* schedule call */
    async scheduleCall(jid, title, type, time) {
        this.mPage.addScriptTag({ path: require.resolve("@amiruldev/wajs") });
        await this.mPage.waitForFunction(() => window.WPP ?.isReady);

        const isAuthenticated = await this.mPage.evaluate(() => WPP.conn.isAuthenticated());
        if (isAuthenticated) {
            return this.mPage.evaluate(({ jid, title, type, time }) => {
                return WPP.chat.sendScheduledCallMessage(jid, {
                    title: title,
                    callType: type || 'audio',
                    scheduledTimestampMs: time || 1696084222000
                })
            }, { jid, title, type, time })
        }
    }

    /* download message */
    async downloadMediaMessage(msg) {
        if (!Boolean(msg.mediaKey && msg.directPath))
            throw new Error("Not Media Message");

        const result = await this.mPage.evaluate(
            async ({
                directPath,
                encFilehash,
                filehash,
                mediaKey,
                type,
                mediaKeyTimestamp,
                mimetype,
                filename,
                size,
                _serialized,
            }) => {
                try {
                    const decryptedMedia = await (
                        window.Store.DownloadManager ?.downloadAndMaybeDecrypt ||
                            window.Store.DownloadManager ?.downloadAndDecrypt
                    )({
                            directPath,
                            encFilehash,
                            filehash,
                            mediaKey,
                            mediaKeyTimestamp,
                            type: type === "chat" ? mimetype.split("/")[0] || type : type,
                            signal: new AbortController().signal,
                        });

                    const data = await window.WWebJS.arrayBufferToBase64(decryptedMedia);

                    return {
                        data,
                        mimetype: mimetype,
                        filename: filename,
                        filesize: size,
                    };
                } catch (e) {
                    const blob = await window.WWebJS.chat.downloadMedia(_serialized);
                    return {
                        data: await window.WWebJS.util.blobToBase64(blob),
                        mimetype: mimetype,
                        filename: filename,
                        filesize: size,
                    };
                }
            }, {
                directPath: msg.directPath,
                encFilehash: msg.encFilehash,
                filehash: msg.filehash,
                mediaKey: msg.mediaKey,
                type: msg.type,
                mediaKeyTimestamp: msg.mediaKeyTimestamp,
                mimetype: msg.mime,
                filename: msg.filename,
                size: msg.fileSize,
                _serialized: msg.id._serialized,
            }
        );

        if (!result) return undefined;
        return Util.base64ToBuffer(result ?.data);
    }

    /**
     * download media and save
     * @param {*} message 
     * @param {*} filename 
     * @returns 
     */
    async downloadAndSaveMedia(message, filename) {
        if (!message.isMedia) return;
        const buffer = await this.downloadMediaMessage(message);
        const getF = await Util.getFile(buffer)
        filename = filename ? filename : Util.getRandom(getF.ext)
        const folderPath = path.join(__dirname, "..", "..", "..", "temp")
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            console.log('Folder "temp" created!!');
        }
        const filePath = path.join(__dirname, "..", "..", "..", "temp", filename);
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(filePath);
                }
            });
        });
    }

    /**
     * save contact
     * @param {*} number 
     * @returns 
     */
    async isSaveContact(number) {
        let contact = await this.mPage.evaluate((number) => {
            return window.WWebJS.getContact(number);
        }, number);

        let res = ContactFactory.create(this, contact);
        return res.isMyContact;
    }

    /**
     * Sets the current user's profile picture.
     * @param {MessageMedia} media
     * @returns {Promise<boolean>} Returns true if the picture was properly updated.
     */
    async setProfilePict(chatId, content, type = 'normal') {
        let data
        if ((Buffer.isBuffer(content) || /^data:.*?\/.*?;base64,/i.test(content) || /^https?:\/\//.test(content) || fs.existsSync(content))) {
            let media = await Util.getFile(content)
            if (type === 'long') {
                data = {
                    img: await (await Util.resizeImage(media ?.data, 720)).toString('base64'),
                    preview: await (await Util.resizeImage(media ?.data, 120)).toString('base64')
                }
            } else if (type === 'normal') {
                data = {
                    img: await (await Util.resizeImage(media ?.data, 540)).toString('base64'),
                    preview: await (await Util.resizeImage(media ?.data, 86)).toString('base64')
                }
            }
        }

        return this.mPage.evaluate(async ({ chatId, preview, image, type }) => {
            let chatWid = await window.Store.WidFactory.createWid(chatId)

            if (type === 'delete') return window.Store.GroupUtils.requestDeletePicture(chatWid)

            return window.Store.GroupUtils.sendSetPicture(chatWid, image, preview)
        }, { chatId, preview: data.img, image: data.preview, type })
    }


    /* change theme wweb */
    async setTheme(type = "dark") {
        if (type !== "dark" && type !== "light") {
            return {
                status: false,
                message: 'Invalid option. Only "dark" or "light" are allowed',
            };
        }

        try {
            await this.mPage.evaluate(async (type) => {
                await window.extra.theme[0].setTheme(type);
            }, type);

            return {
                status: 200,
                message: `Successfully changed to ${type} mode`,
            };
        } catch (error) {
            return {
                status: false,
                message: "Can't change theme",
            };
        }
    }

    /* get theme */
    async getTheme() {
        const theme = await this.mPage.evaluate(async () => {
            if (window.localStorage) {
                return await JSON.parse(JSON.stringify(window.localStorage)) ?.theme;
            } else {
                return await window.Store.Theme.getTheme();
            }
        });

        if (!theme) return false;
        return theme;
    }

    /**
     * join wa beta
     * @param {*} act 
     * @returns 
     */
    async joinBeta(act) {
        this.mPage.addScriptTag({ path: require.resolve("@amiruldev/wajs") });
        await this.mPage.waitForFunction(() => window.WPP ?.isReady);

        const isAuthenticated = await this.mPage.evaluate(() => WPP.conn.isAuthenticated());
        if (isAuthenticated) {
            const res = await this.mPage.evaluate((act) => {
                return WPP.conn.joinWebBeta(act);
            }, act);
            if (act == true) {
                return `successfully entered beta mode`;
            } else if (act == false) {
                return `managed to get out of beta mode`;
            }
        }
    }

    // end function
}

module.exports = Client;
