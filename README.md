[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#table-of-contents)
# MYWAJS
[COMMUNITY - CLICK HERE](https://chat.whatsapp.com/BIHE3USWr4lAnahwJTQEOX)

 > *NB*: ini adalah remake dari wawebjs & wjs, project ini sudah izin terlebih dahulu ke sumbernya. yang gasuka silahkan nyinyir sepuasnya 😸. cukup senyumin aja
 
 <p align="center">
<img width="" src="https://img.shields.io/github/repo-size/amiruldev20/mywajs?color=green&label=Repo%20Size&style=for-the-badge&logo=appveyor">

[![npm version](https://img.shields.io/npm/v/mywajs.svg?color=green)](https://www.npmjs.com/package/mywajs)
![node](https://img.shields.io/node/v/mywajs)
[![Downloads](https://img.shields.io/npm/dm/mywajs.svg)](https://www.npmjs.com/package/mywajs)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/amiruldev20/mywajs.svg)](http://isitmaintained.com/project/amiruldev20/mywajs "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/amiruldev20/mywajs.svg)](http://isitmaintained.com/project/amiruldev20/mywajs "Percentage of issues still open")

</p>

#### tq to: pedro (whatsapp-web.js) & edgard (wjs)

## Testing run
| Platform | Work |
| ---------|------|
| Replit | ✅ |
| VPS | ✅ |
| Panel Ptero | ✅ |
| Dpanel (Goldpanel) | ✅ |
| Termux | ⏳ |
| Rdp | ✅ |
| Google Shell | ✅ |
| Gitpod | ✅ |

## Konfigurasi + Auto Clear Sesi
```
 const mywa = new Client({
        authStrategy: new mywajs.LocalAuth(),
        playwright: {
            headless: true,
            devtools: false,
            args: [
                '--aggressive-tab-discard',
                '--disable-accelerated-2d-canvas',
                '--disable-application-cache',
                '--disable-cache',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-offline-load-stale-cache',
                '--disable-setuid-sandbox',
                '--disable-setuid-sandbox',
                '--disk-cache-size=0',
                '--ignore-certificate-errors',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote',
                //'--enable-features=WebContentsForceDark:inversion_method/cielab_based/image_behavior/selective/text_lightness_threshold/150/background_lightness_threshold/205'
            ],
            bypassCSP: true,
        },
        markOnlineAvailable: true,
        qrMaxRetries: 2,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
        takeoverTimeoutMs: 'Infinity',
        clearSessions: true // work jika nama folder session default dari mywajs (.mywajs_auth/session)
    })
```

 ##  FUNCTION EXTRA
| Feature  | Status |
| ------------- | ------------- |
| Convert ES Module To CommonJS | ✅ |
| Convert CommonJS To ES Module | ✅ |
| Save Contact | ⏳ |
| Code Fixed Beta | ✅ |
| Change Language Code Beta | ✅ |
| Read Story  |  ✅  |
| Call Number |  ✅  |
| Call Groups |  ✅  |
| Create Avatar | ✅ |
| Accept / Reject Member | ✅ |
| Get Story | ✅ |
| Reject Call | ✅ |
| Accept Call | ⏳ |
| Upload Story Text  |  ✅  |
| Upload Story Image |  ⏳  |
| Upload Story Video |  ⏳  |
| Upload Story VN  |   ⏳  |
