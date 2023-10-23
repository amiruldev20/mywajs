/*
 * MywaJS 2023
 * re-developed wwebjs
 * using with playwright & wajs
 * contact:
 * wa: 085157489446
 * ig: amirul.dev
 */
'use strict';
const path = require('path');
const Crypto = require('crypto');
const { tmpdir } = require('os');
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const fs = require('fs').promises;
const sharp = require('sharp')
const { Readable } = require('stream')
const Fs = require('fs')
const axios = require('axios')
const BodyForm = require('form-data')
const fileType = require('file-type')
const mimes = require('mime-types')

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/**
 * Utility methods
 */
class Util {
    constructor() {
        throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static getRandom(ext = "", length = "10") {
        var result = ""
        var character = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"
        var characterLength = character.length
        for (var i = 0; i < length; i++) {
            result += character.charAt(Math.floor(Math.random() * characterLength))
        }

        return `${result}${ext ? `.${ext}` : ""}`
    }

    static bufferToBase64(buffer) {
        if (!Buffer.isBuffer(buffer)) throw new Error("Buffer Not Detected")

        var buf = new Buffer(buffer)
        return buf.toString('base64')
    }

    static formatSize(bytes) {
        if (bytes >= 1000000000) {
            bytes = (bytes / 1000000000).toFixed(2) + " GB";
        } else if (bytes >= 1000000) {
            bytes = (bytes / 1000000).toFixed(2) + " MB";
        } else if (bytes >= 1000) {
            bytes = (bytes / 1000).toFixed(2) + " KB";
        } else if (bytes > 1) {
            bytes = bytes + " bytes";
        } else if (bytes == 1) {
            bytes = bytes + " byte";
        } else {
            bytes = "0 bytes";
        }
        return bytes;
    }

    static isBase64(string) {
        const regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
        return regex.test(string)
    }

    static isUrl(url) {
        return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'))
    }

    static generateHash(length) {
        var result = "";
        var characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    static base64ToBuffer(base) {
        return Buffer.from(base, 'base64')
    }

    static generateHash(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    /**
     * Sets default properties on an object that aren't already specified.
     * @param {Object} def Default properties
     * @param {Object} given Object to assign defaults to
     * @returns {Object}
     * @private
     */
    static mergeDefault(def, given) {
        if (!given) return def;
        for (const key in def) {
            if (!has(given, key) || given[key] === undefined) {
                given[key] = def[key];
            } else if (given[key] === Object(given[key])) {
                given[key] = Util.mergeDefault(def[key], given[key]);
            }
        }

        return given;
    }

    /**
     * Formats a image to webp
     * @param {MessageMedia} media
     * 
     * @returns {Promise<MessageMedia>} media in webp format
     */
    static async formatImageToWebpSticker(media, mPage) {
        if (!media.mimetype.includes('image'))
            throw new Error('media is not a image');

        if (media.mimetype.includes('webp')) {
            return media;
        }

        return mPage.evaluate((media) => {
            return window.WWebJS.toStickerData(media);
        }, media);
    }

    /**
     * Formats a video to webp
     * @param {MessageMedia} media
     * 
     * @returns {Promise<MessageMedia>} media in webp format
     */
    static async formatVideoToWebpSticker(media) {
        if (!media.mimetype.includes('video'))
            throw new Error('media is not a video');

        const videoType = media.mimetype.split('/')[1];

        const tempFile = path.join(
            tmpdir(),
            `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
        );

        const stream = new Readable();
        const buffer = Buffer.from(
            media.data.replace(`data:${media.mimetype};base64,`, ''),
            'base64'
        );
        stream.push(buffer);
        stream.push(null);

        await new Promise((resolve, reject) => {
            ffmpeg(stream)
                .inputFormat(videoType)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec',
                    'libwebp',
                    '-vf',
                    // eslint-disable-next-line no-useless-escape
                    'scale=\'iw*min(300/iw\,300/ih)\':\'ih*min(300/iw\,300/ih)\',format=rgba,pad=300:300:\'(300-iw)/2\':\'(300-ih)/2\':\'#00000000\',setsar=1,fps=10',
                    '-loop',
                    '0',
                    '-ss',
                    '00:00:00.0',
                    '-t',
                    '00:00:05.0',
                    '-preset',
                    'default',
                    '-an',
                    '-vsync',
                    '0',
                    '-s',
                    '512:512',
                ])
                .toFormat('webp')
                .save(tempFile);
        });

        const data = await fs.readFile(tempFile, 'base64');
        await fs.unlink(tempFile);

        return {
            mimetype: 'image/webp',
            data: data,
            filename: media.filename,
        };
    }

    /**
     * Sticker metadata.
     * @typedef {Object} StickerMetadata
     * @property {string} [name] 
     * @property {string} [author] 
     * @property {string[]} [categories]
     */

    /**
     * Formats a media to webp
     * @param {MessageMedia} media
     * @param {StickerMetadata} metadata
     * 
     * @returns {Promise<MessageMedia>} media in webp format
     */
    static async formatToWebpSticker(media, metadata, playPage) {
        let webpMedia;

        if (media.mimetype.includes("webp"))
            webpMedia = {
                mimetype: "image/webp",
                data: media.data,
                filename: undefined,
            };
        else if (media.mimetype.includes("image"))
            webpMedia = await this.formatImageToWebpSticker(media, playPage);
        else if (media.mimetype.includes("video"))
            webpMedia = await this.formatVideoToWebpSticker(media);
        else throw new Error("Invalid media format");

        if (typeof metadata === "object" && metadata !== null) {
            const img = new webp.Image();
            const hash = this.generateHash(32);
            const json = {
                "sticker-pack-id": metadata.packId ? metadata.packId : hash,
                "sticker-pack-name": metadata.packName ?
                    metadata.packName :
                    "MywaJS",
                "sticker-pack-publisher": metadata.packPublish ?
                    metadata.packPublish :
                    "Amirul Dev",
                "sticker-pack-publisher-email": metadata.packEmail ?
                    metadata.packEmail :
                    "",
                "sticker-pack-publisher-website": metadata.packWebsite ?
                    metadata.packWebsite :
                    "https://instagram.com/amirul.dev",
                "android-app-store-link": metadata.androidApp ?
                    metadata.androidApp :
                    "",
                "ios-app-store-link": metadata.iOSApp ? metadata.iOSApp : "",
                emojis: metadata.categories ? metadata.categories : [],
                "is-avatar-sticker": metadata.isAvatar ? metadata.isAvatar : 0,
            };
            let exifAttr = Buffer.from([
                0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
                0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
            ]);
            let jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
            let exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);
            await img.load(Buffer.from(webpMedia.data, "base64"));
            img.exif = exif;
            webpMedia.data = (await img.save(null)).toString("base64");
        }

        return webpMedia;
    }

    /**
     * Configure ffmpeg path
     * @param {string} path
     */
    static setFfmpegPath(path) {
        ffmpeg.setFfmpegPath(path);
    }

    /* fetch buffer */
    static fetchBuffer(string, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (/^https?:\/\//i.test(string)) {
                    let data = await axios.get(string, {
                        headers: {
                            ...(!!options.headers ? options.headers : {}),
                        },
                        responseType: "arraybuffer",
                        ...options,
                    })
                    let buffer = await data ?.data
                    let name = /filename/i.test(data.headers ?.get("content-disposition")) ? data.headers ?.get("content-disposition") ?.match(/filename=(.*)/) ?.[1] ?.replace(/["';]/g, '') : ''
                    let mime = mimes.lookup(name) || data.headers.get("content-type") || (await fileType.fromBuffer(buffer)) ?.mime
                    resolve({
                        data: buffer,
                        size: Buffer.byteLength(buffer),
                        sizeH: this.formatSize(Buffer.byteLength(buffer)),
                        name,
                        mime,
                        ext: mimes.extension(mime)
                    });
                } else if (/^data:.*?\/.*?;base64,/i.test(string)) {
                    let data = Buffer.from(string.split`,`[1], "base64")
                    let size = Buffer.byteLength(data)
                    resolve({
                        data,
                        size,
                        sizeH: this.formatSize(size),
                        ...((await fileType.fromBuffer(data)) || {
                            mime: "application/octet-stream",
                            ext: ".bin"
                        })
                    });
                } else if (Fs.existsSync(string) && Fs.statSync(string).isFile()) {
                    let data = Fs.readFileSync(string)
                    let size = Buffer.byteLength(data)
                    resolve({
                        data,
                        size,
                        sizeH: this.formatSize(size),
                        ...((await fileType.fromBuffer(data)) || {
                            mime: "application/octet-stream",
                            ext: ".bin"
                        })
                    });
                } else if (Buffer.isBuffer(string)) {
                    let size = Buffer ?.byteLength(string) || 0
                    resolve({
                        data: string,
                        size,
                        sizeH: this.formatSize(size),
                        ...((await fileType.fromBuffer(string)) || {
                            mime: "application/octet-stream",
                            ext: ".bin"
                        })
                    });
                } else if (/^[a-zA-Z0-9+/]={0,2}$/i.test(string)) {
                    let data = Buffer.from(string, "base64")
                    let size = Buffer.byteLength(data)
                    resolve({
                        data,
                        size,
                        sizeH: this.formatSize(size),
                        ...((await fileType.fromBuffer(data)) || {
                            mime: "application/octet-stream",
                            ext: ".bin"
                        })
                    });
                } else {
                    let buffer = Buffer.alloc(20)
                    let size = Buffer.byteLength(buffer)
                    resolve({
                        data: buffer,
                        size,
                        sizeH: this.formatSize(size),
                        ...((await fileType.fromBuffer(buffer)) || {
                            mime: "application/octet-stream",
                            ext: ".bin"
                        })
                    });
                }
            } catch (e) {
                reject(new Error(e ?.message || e))
            }
        });
    }

    /* get file */
    static async getFile(PATH, save, options = {}) {
        try {
            options = !!options.headers ? options.headers : {}
            let filename = null;
            let data = (await this.fetchBuffer(PATH, {
                headers: {
                    referer: 'https://y2mate.com'
                }
            }))

            if (data ?.data && save) {
                filename = `../../temp/${Date.now()}.${data.ext}`
                Fs.promises.writeFile(filename, data ?.data);
            }
            return {
                filename: data ?.name ? data.name : filename,
                ...data
            };
        } catch (e) {
            throw e
        }
    }

    /* upload media */
    static upload(buffer, exts) {
        return new Promise(async (resolve, reject) => {
            const { ext, data: buffers } = await this.getFile(buffer)
            const form = new BodyForm();
            form.append("files[]", buffers, this.getRandom(exts || ext))
            await axios({
                url: "https://pomf.lain.la/upload.php",
                method: "POST",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
                    ...form.getHeaders()
                },
                data: form
            }).then((data) => {
                resolve(data.data.files[0])
            }).catch((err) => resolve(err))
        })
    }

    /* resize image */
    static async resizeImage(buffer, height) {
        buffer = (await this.getFile(buffer)).data
        /**
         * @param {Sharp} img
         * @param {number} maxSize
         * @return {Promise<Sharp>}
         */
        const resizeByMax = async (img, maxSize) => {
            const metadata = await img.metadata();
            const outputRatio = maxSize / Math.max(metadata.height, metadata.width);
            return img.resize(Math.floor(metadata.width * outputRatio), Math.floor(metadata.height * outputRatio));
        };

        const img = await sharp(buffer)

        return (await resizeByMax(img, height)).toFormat('jpg').toBuffer()
    }

}

module.exports = Util;