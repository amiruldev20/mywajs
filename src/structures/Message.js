/*
 * MywaJS 2023
 * re-developed wwebjs
 * using with playwright & wajs
 * contact:
 * wa: 085157489446
 * ig: amirul.dev
 */
"use strict";

import Base from "./Base.js";
import MessageMedia from "./MessageMedia.js";
import Location from "./Location.js";
import Order from "./Order.js";
import Payment from "./Payment.js";
import {
    MessageTypes
} from "../util/Constants.js";
import PollVote from "./PollVote.js";

/**
 * Represents a Message on WhatsApp
 * @extends {Base}
 */
class Message extends Base {
    constructor(client, data) {
        super(client);
        if (!data.author) {
            data.author = data.from.endsWith('c.us') ? data.from : data.author;
        }
        if (data) this._patch(data);
    }

    _patch(data) {
        this._data = data;

        /**
         * MediaKey that represents the sticker 'ID'
         * @type {string}
         */
        this.mediaKey = data.mediaKey;

        /**
         * ID that represents the message
         * @type {object}
         */
        this.id = data.id;

        /**
         * ACK status for the message
         * @type {MessageAck}
         */
        this.ack = data.ack;

        /**
         * Indicates if the message has media available for download
         * @type {boolean}
         */
        this.hasMedia = Boolean(data.mediaKey && data.directPath);

        /**
         * Message content
         * @type {string}
         */
        this.body = this.hasMedia ?
            data.caption || "" :
            data.body || data.pollName || "";

        /**
         * Message type
         * @type {MessageTypes}
         */
        this.type = data.type;

        /**
         * Unix timestamp for when the message was created
         * @type {number}
         */
        this.timestamp = data.t;

        /**
         * ID for the Chat that this message was sent to, except if the message was sent by the current user.
         * @type {string}
         */
        this.from =
            typeof data.from === "object" && data.from !== null ?
            data.from._serialized :
            data.from;

        /**
         * ID for who this message is for.
         *
         * If the message is sent by the current user, it will be the Chat to which the message is being sent.
         * If the message is sent by another user, it will be the ID for the current user.
         * @type {string}
         */
        this.to =
            typeof data.to === "object" && data.to !== null ?
            data.to._serialized :
            data.to;

        /**
         * If the message was sent to a group, this field will contain the user that sent the message.
         * @type {string}
         */
        this.author =
            typeof data.author === "object" && data.author !== null ?
            data.author._serialized :
            data.author;

        /**
         * String that represents from which device type the message was sent
         * @type {string}
         */
        this.deviceType =
            typeof data.id.id === "string" && data.id.id.length > 21 ?
            "android" :
            typeof data.id.id === "string" && data.id.id.substring(0, 2) === "3A" ?
            "ios" :
            "web";

        /**
         * Indicates if the message was forwarded
         * @type {boolean}
         */
        this.isForwarded = data.isForwarded;

        /**
         * Indicates how many times the message was forwarded.
         *
         * The maximum value is 127.
         * @type {number}
         */
        this.forwardingScore = data.forwardingScore || 0;

        /**
         * Indicates if the message is a status update
         * @type {boolean}
         */
        this.isStatus = data?.isStatusV3 || data.id.remote === "status@broadcast";

        /**
         * Indicates if the message was starred
         * @type {boolean}
         */
        this.isStarred = data.star;

        /**
         * Indicates if the message was a broadcast
         * @type {boolean}
         */
        this.broadcast = data.broadcast;

        /**
         * Indicates if the message was sent by the current user
         * @type {boolean}
         */
        this.fromMe = data.id.fromMe;

        /**
         * Indicates if the message was sent as a reply to another message.
         * @type {boolean}
         */
        this.hasQuotedMsg =
            data.quotedMsg && data.quotedStanzaID && data.quotedParticipant ?
            true :
            false;

        /**
         * Indicates the duration of the message in seconds
         * @type {string}
         */
        this.duration = data.duration ? data.duration : undefined;

        /**
         * Location information contained in the message, if the message is type "location"
         * @type {Location}
         */
        this.location =
            data.type === MessageTypes.LOCATION ?
            new Location(data.lat, data.lng, data.loc) :
            undefined;

        /**
         * List of vCards contained in the message.
         * @type {Array<string>}
         */
        this.vCards =
            data.type === MessageTypes.CONTACT_CARD_MULTI ?
            data.vcardList.map((c) => c.vcard) :
            data.type === MessageTypes.CONTACT_CARD ?
            [data.body] :
            [];

        /**
         * Group Invite Data
         * @type {object}
         */
        this.inviteV4 =
            data.type === MessageTypes.GROUP_INVITE ?
            {
                inviteCode: data.inviteCode,
                inviteCodeExp: data.inviteCodeExp,
                groupId: data.inviteGrp,
                groupName: data.inviteGrpName,
                fromId: data.from?._serialized ? data.from._serialized : data.from,
                toId: data.to?._serialized ? data.to._serialized : data.to,
            } :
            undefined;

        /**
         * Indicates the mentions in the message body.
         * @type {Array<string>}
         */
        this.mentionedIds = [];

        if (data.mentionedJidList) {
            this.mentionedIds = data.mentionedJidList;
        }

        /**
         * Order ID for message type ORDER
         * @type {string}
         */
        this.orderId = data.orderId ? data.orderId : undefined;
        /**
         * Order Token for message type ORDER
         * @type {string}
         */
        this.token = data.token ? data.token : undefined;

        /**
         * Indicates whether the message is a Gif
         * @type {boolean}
         */
        this.isGif = Boolean(data.isGif);

        /**
         * Indicates if the message will disappear after it expires
         * @type {boolean}
         */
        this.isEphemeral = data.isEphemeral;

        /** Title */
        if (data.title) {
            this.title = data.title;
        }

        /** Description */
        if (data.description) {
            this.description = data.description;
        }

        /** Business Owner JID */
        if (data.businessOwnerJid) {
            this.businessOwnerJid = data.businessOwnerJid;
        }

        /** Product ID */
        if (data.productId) {
            this.productId = data.productId;
        }

        /**
         * Links included in the message.
         * @type {Array<{link: string, isSuspicious: boolean}>}
         *
         */
        this.links = data.links;

        /** Buttons */
        if (data.dynamicReplyButtons) {
            this.dynamicReplyButtons = data.dynamicReplyButtons;
        }

        /** Selected Button Id **/
        if (data.selectedButtonId) {
            this.selectedButtonId = data.selectedButtonId;
        }

        /** Selected List row Id **/
        if (
            data.listResponse &&
            data.listResponse.singleSelectReply.selectedRowId
        ) {
            this.selectedRowId = data.listResponse.singleSelectReply.selectedRowId;
        }

        return super._patch(data);
    }

    _getChatId() {
        return this.fromMe ? this.to : this.from;
    }

    /**
     * reload original message result whatsapp web
     * @returns 
     */
    async reload() {
        const newData = await this.client.mPage.evaluate((msgId) => {
            const msg = window.Store.Msg.get(msgId);
            if (!msg) return null;
            return window.WWebJS.getMessageModel(msg);
        }, this.id._serialized);

        if (!newData) return null;

        this._patch(newData);
        return this;
    }

    /**
     * Returns message in a raw format
     * @type {Object}
     */
    get rawData() {
        return this._data;
    }

    /**
     * getchat from the sender of the message
     * @returns 
     */
    getChat() {
        return this.client.getChatById(this._getChatId());
    }

    /**
     * getcontact from both the sender and the quoted
     * @returns 
     */
    getContact() {
        return this.client.getContactById(this.author || this.from);
    }

    /**
     * Returns the Contacts mentioned in this message
     * @returns {Promise<Array<Contact>>}
     */
    async getMentions() {
        return await Promise.all(this.mentionedIds.map(async m => await this.client.getContactById(m)));
    }

    /**
     * get the message that was replied
     * @returns 
     */
    async getQuotedMessage() {
        if (!this.hasQuotedMsg) return undefined;

        const quotedMsg = await this.client.mPage.evaluate((msgId) => {
            const msg = window.Store.Msg.get(msgId);
            const quotedMsg = window.Store.QuotedMsg.getQuotedMsgObj(msg);
            return window.WWebJS.getMessageModel(quotedMsg);
        }, this.id._serialized);

        return new Message(this.client, quotedMsg);
    }

    /**
     * Send message with reply
     * @param {*} content 
     * @param {*} chatId 
     * @param {*} options 
     */
    async reply(content, chatId, options = {}) {
        if (!chatId) {
            chatId = this._getChatId();
        }
        this.client.sendMessage(chatId, content, {
            quoted: this.id._serialized,
            ...options,
        });
    }

    /**
     * React this message with emoji
     * @param {*} reaction 
     */
    async react(reaction) {
        await this.client.mPage.evaluate(
            async ({
                messageId,
                reaction
            }) => {
                if (!messageId) {
                    return undefined;
                }

                const msg = await window.Store.Msg.get(messageId);
                await window.Store.sendReactionToMsg(msg, reaction);
            }, {
                messageId: this.id._serialized,
                reaction,
            }
        );
    }

    /**
     * Forwards this message to another chat (that you chatted before, otherwise it will fail)
     *
     * @param {string|Chat} chat Chat model or chat ID to which the message will be forwarded
     * @returns {Promise}
     */
    async forward(chat) {
        const chatId = typeof chat === "string" ? chat : chat.id._serialized;

        await this.client.mPage.evaluate(
            async ({
                msgId,
                chatId
            }) => {
                let msg = window.Store.Msg.get(msgId);
                let chat = window.Store.Chat.get(chatId);

                return await chat.forwardMessages([msg]);
            }, {
                msgId: this.id._serialized,
                chatId,
            }
        );
    }

    /**
     * Downloads and returns the attatched message media
     * @returns {Promise<MessageMedia>}
     */
    async downloadMedia() {
        if (!this.hasMedia) {
            return undefined;
        }

        const result = await this.client.mPage.evaluate(
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
                        window.Store.DownloadManager?.downloadAndMaybeDecrypt ||
                        window.Store.DownloadManager?.downloadAndDecrypt
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
                directPath: this.directPath,
                encFilehash: this.encFilehash,
                filehash: this.filehash,
                mediaKey: this.mediaKey,
                type: this.type,
                mediaKeyTimestamp: this.mediaKeyTimestamp,
                mimetype: this.mime,
                filename: this.filename,
                size: this.fileSize,
                _serialized: this.id._serialized,
            }
        );

        if (!result) return undefined;
        return new MessageMedia(
            result.mimetype,
            result.data,
            result.filename,
            result.filesize
        );
    }

    /**
     * Deletes a message from the chat
     * @param {?boolean} everyone If true and the message is sent by the current user or the user is an admin, will delete it for everyone in the chat.
     */
    async delete(everyone) {
        await this.client.mPage.evaluate(
            async ({
                msgId,
                everyone
            }) => {
                let msg = window.Store.Msg.get(msgId);
                let chat = await window.Store.Chat.find(msg.id.remote || msg.chat);

                const canRevoke =
                    window.Store.MsgActionChecks.canSenderRevokeMsg(msg) ||
                    window.Store.MsgActionChecks.canAdminRevokeMsg(msg);
                if (everyone && canRevoke) {
                    return window.Store.Cmd.sendRevokeMsgs(chat, [msg], {
                        clearMedia: true,
                        type: msg.id.fromMe ? "Sender" : "Admin",
                    });
                }

                return window.Store.Cmd.sendDeleteMsgs(chat, [msg], true);
            }, {
                msgId: this.id._serialized,
                everyone,
            }
        );
    }

    /**
     * Stars this message
     */
    async star() {
        await this.client.mPage.evaluate(async (msgId) => {
            let msg = window.Store.Msg.get(msgId);

            if (window.Store.MsgActionChecks.canStarMsg(msg)) {
                let chat = await window.Store.Chat.find(msg.id.remote);
                return window.Store.Cmd.sendStarMsgs(chat, [msg], false);
            }
        }, this.id._serialized);
    }

    /**
     * Unstars this message
     */
    async unstar() {
        await this.client.mPage.evaluate(async (msgId) => {
            let msg = window.Store.Msg.get(msgId);

            if (window.Store.MsgActionChecks.canStarMsg(msg)) {
                let chat = await window.Store.Chat.find(msg.id.remote);
                return window.Store.Cmd.sendUnstarMsgs(chat, [msg], false);
            }
        }, this.id._serialized);
    }

    /**
     * Message Info
     * @typedef {Object} MessageInfo
     * @property {Array<{id: ContactId, t: number}>} delivery Contacts to which the message has been delivered to
     * @property {number} deliveryRemaining Amount of people to whom the message has not been delivered to
     * @property {Array<{id: ContactId, t: number}>} played Contacts who have listened to the voice message
     * @property {number} playedRemaining Amount of people who have not listened to the message
     * @property {Array<{id: ContactId, t: number}>} read Contacts who have read the message
     * @property {number} readRemaining Amount of people who have not read the message
     */

    /**
     * Get information about message delivery status. May return null if the message does not exist or is not sent by you.
     * @returns {Promise<?MessageInfo>}
     */
    async getInfo() {
        const info = await this.client.mPage.evaluate(async (msgId) => {
            const msg = window.Store.Msg.get(msgId);
            if (!msg) return null;

            return await window.Store.MessageInfo.sendQueryMsgInfo(msg);
        }, this.id._serialized);

        return info;
    }

    /**
     * Gets the order associated with a given message
     * @return {Promise<Order>}
     */
    async getOrder() {
        if (this.type === MessageTypes.ORDER) {
            const result = await this.client.mPage.evaluate(
                ({
                    orderId,
                    token,
                    chatId
                }) => {
                    return window.WWebJS.getOrderDetail(orderId, token, chatId);
                }, {
                    orderId: this.orderId,
                    token: this.token,
                    chatId: this._getChatId(),
                }
            );
            if (!result) return undefined;
            return new Order(this.client, result);
        }
        return undefined;
    }

    async find(string, text) {
        if (new RegExp(string, "i").test(text)) {
            return true;
        } else {
            return false;
        }
    }
    /**
     * Gets the payment details associated with a given message
     * @return {Promise<Payment>}
     */
    async getPayment() {
        if (this.type === MessageTypes.PAYMENT) {
            const msg = await this.client.mPage.evaluate(async (msgId) => {
                const msg = window.Store.Msg.get(msgId);
                if (!msg) return null;
                return msg.serialize();
            }, this.id._serialized);
            return new Payment(this.client, msg);
        }
        return undefined;
    }

    async refreshPollVotes() {
        if (this.type !== MessageTypes.POLL_CREATION) throw 'Invalid usage! Can only be used with a pollCreation message';
        const pollVotes = await this.client.mPage.evaluate((parentMsgId) => {
            return window.Store.PollVote.getForParent([parentMsgId]).map(a => a.serialize())[0];
        }, this.id._serialized);
        this.pollVotes = pollVotes.map((pollVote) => {
            return new PollVote(this.client, {
                ...pollVote,
                pollCreationMessage: this
            });
        });
        return;
    }

    /**
     * Vote to the poll.
     * @param {Array<string>} selectedOptions Array of options selected.
     * @returns {Promise<void>}
     */
    async vote(selectedOptions) {
        if (this.type !== MessageTypes.POLL_CREATION) throw 'Invalid usage! Can only be used with a pollCreation message';

        return await this.client.mPage.evaluate(({
            creationMsgId,
            selectedOptions
        }) => {
            window.WWebJS.votePoll(creationMsgId, selectedOptions);
        }, {
            creationMsgId: this.id._serialized,
            selectedOptions
        });
    }


    /**
     *
     * @param {Boolean} block block or no user
     * @returns {Promise<void>}
     */
    async report(block = false) {
        await this.client.mPage.evaluate(
            async ({
                msgId,
                block
            }) => {
                let msg = await window.Store.Msg.get(msgId);

                if (block) {
                    return window.Store.GroupUtils.sendMessageReportBlock(msg);
                } else {
                    return window.Store.GroupUtils.sendMessageReport(msg);
                }
            }, {
                msgId: this.id._serialized,
                block,
            }
        );
    }
}

export default Message;
