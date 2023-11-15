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
</details>

<details><summary><b>Get All Contacts</b></summary>
    
> **INFO**
> This function is used to get all contacts

```javascript
client.getContacts()
```
</details>

<details><summary><b>Get Contact From ID</b></summary>
    
> **INFO**
> This function is used to get contact from id

```javascript
client.gefContactById("xx@c.us")
```
</details>

<details><summary><b>Get Message From ID</b></summary>
    
> **INFO**
> This function is used to get message from id

```javascript
client.getMessageById(msgID)
```
</details>

<details><summary><b>Get Invite Info</b></summary>
    
> **INFO**
> This function is used to get detail code invite

```javascript
client.getInviteInfo(codeinvite)
```
</details>

<details><summary><b>Accept Invite Code</b></summary>
    
> **INFO**
> This function is used to accept code invite

```javascript
client.acceptInvite(code)
```
</details>

<details><summary><b>Accept V4 Invite</b></summary>
    
> **INFO**
> This function is used to accept v4 invite

```javascript
client.acceptV4Invite(message)
```
</details>

<details><summary><b>Change Status BIO</b></summary>
    
> **INFO**
> This function is used to change status bio

```javascript
client.setStatus("hello world")
```
</details>

<details><summary><b>Change Name</b></summary>
    
> **INFO**
> This function is used to change name wa bot

```javascript
client.setName("Mywa BOT")
```
</details>

<details><summary><b>Get State Whatsapp</b></summary>
    
> **INFO**
> This function is used to get state

```javascript
client.getState()
```
</details>

<details><summary><b>Presence Online</b></summary>
    
> **INFO**
> This function is used to set presence online

```javascript
client.sendPresenceAvailable()
```
</details>

<details><summary><b>Presence Offline</b></summary>
    
> **INFO**
> This function is used to set presence offline

```javascript
client.sendPresenceUnavailable()
```
</details>

<details><summary><b>Archive Chat</b></summary>
    
> **INFO**
> This function is used to archive chat

```javascript
client.archiveChat(chatId)
```
</details>

<details><summary><b>Unarvhive Chat</b></summary>
    
> **INFO**
> This function is used to unarchive chat

```javascript
client.unarchiveChat(chatid)
```
</details>

<details><summary><b>Pin Chat</b></summary>
    
> **INFO**
> This function is used to pin chat

```javascript
client.pinChat(chatId)
```
</details>

<details><summary><b>Unpin Chat</b></summary>
    
> **INFO**
> This function is used to unpin chat

```javascript
client.unpinChat(chatId)
```
</details>

<details><summary><b>Mute Chat</b></summary>
    
> **INFO**
> This function is used to mute chat

```javascript
client.muteChat(chatId, time)
```
</details>

<details><summary><b>Unmute Chat</b></summary>
    
> **INFO**
> This function is used to unmute chat

```javascript
client.unmuteChat(chatId)
```
</details>

