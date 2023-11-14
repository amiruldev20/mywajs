# MywaJS Documentation

<details><summary><b>Create Client</b></summary>

1. for commonjs (CJS)

    ```javascript
    const { Client, LinkingMethod, LocalAuth } = require("mywajs")
    const client = new Client({
    /* for local auth */
    // authStrategy: new LocalAuth(),

    /* for login phone */
    linkingMethod: new LinkingMethod({
                    phone: {
                        number: "62851xx",
                    },
                }),
        playwright: {
            headless: true,
            devtools: false
        },
        markOnlineAvailable: false,
        authTimeoutMs: 60000
    })

    client.initialize()

    client.on('loading_screen', (percent, message) => {
    console.log('Loading screen', percent, message)
    })

    /* for qr code */
    // client.on('qr', (qr) => {
    // console.log("Qr Code: ", qr)
    // })

    /* for login code */
    client.on('code', (code) => {
    console.log("Your code: ", code)
   })

    client.on('authenticated', () => {
    console.log('AUTHENTICATED')
   })

   client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg)
   })

   client.on('ready', () => {
    console.log('READY')
   })

   client.on('message', async m => {
    console.log('MESSAGE RECEIVED', m)

    if (m.body === '.ping') {
    m.reply('Active')
    }
   }
    ```

   for test after connecting. Please type `.ping` in your WhatsApp bot


2. for ECMAscript Module (ESM)

    ```javascript
    const { Client, LinkingMethod, LocalAuth } = (await import("mywajs")).default
    const client = new Client({
    /* for local auth */
    // authStrategy: new LocalAuth(),

    /* for login phone */
    linkingMethod: new LinkingMethod({
                    phone: {
                        number: "62851xx",
                    },
                }),
        playwright: {
            headless: true,
            devtools: false
        },
        markOnlineAvailable: false,
        authTimeoutMs: 60000
    })

    client.initialize()

    client.on('loading_screen', (percent, message) => {
    console.log('Loading screen', percent, message)
    })

    /* for qr code */
    // client.on('qr', (qr) => {
    // console.log("Qr Code: ", qr)
    // })

    /* for login code */
    client.on('code', (code) => {
    console.log("Your code: ", code)
   })

    client.on('authenticated', () => {
    console.log('AUTHENTICATED')
   })

   client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg)
   })

   client.on('ready', () => {
    console.log('READY')
   })

   client.on('message', async m => {
    console.log('MESSAGE RECEIVED', m)

    if (m.body === '.ping') {
    m.reply('Active')
    }
   }
    ```

   for test after connecting. Please type `.ping` in your WhatsApp bot
</details>

<details><summary><b>Logout Session</b></summary>
    
> **INFO**
> This function is used to logout the session

```javascript
client.logout()
```
</details>

<details><summary><b>Get Detail WWEB</b></summary>
    
> **INFO**
> This function is used to get detail wweb

```javascript
client.getWWeb()
```
</details>

<details><summary><b>Read Chat</b></summary>
    
> **INFO**
> This function is used to read chat

```javascript
client.sendSeen(chatID)

ex:
client.sendSeen("1278xx@g.us")

support chatId xx@g.us or xx@c.us
```
</details>

<details><summary><b>Send Message</b></summary>
    
> **INFO**
> This function is used to send message

```javascript
client.sendMessage(chatId, content, options)

ex:

// send text
client.sendMessage("xx@c.us", "MywaJS Bot Active")

// send text with quoted
client.sendMessage("xx@c.us", "Hello", { quoted: m })

// send media
client.sendMessage("xx@c.us", url/buffer, { caption: "hello" })

// send document
client.sendMessage("xx@x.us", url/buffer, { asDocument: true })

// send sticker
client.sendMessage("xx@c.us", url/buffer, { asSticker: true })

*list options*
- quoted (object)
- mentions (array)
- externalAdReply (object)
- caption (string)
```
</details>

<details><summary><b>Search Messages</b></summary>
    
> **INFO**
> This function is used to search messages

```javascript
client.searchMessages(text, options)

ex:
client.searchMessages("hello", { page: 1 })

*List Options*
- page (number)
- count (number)
- remote (string)
```
</details>

<details><summary><b>Get All Chats</b></summary>
    
> **INFO**
> This function is used to get all chats

```javascript
client.getChats()
```
</details>

<details><summary><b>Get Chat From ID</b></summary>
    
> **INFO**
> This function is used to get chat from id

```javascript
client.getChatById("xx@c.us")
```
