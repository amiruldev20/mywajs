# MywaJS Documentation

<details><summary><b>Create Client (login phone)</b></summary>

1. for commonjs (CJS)

    ```javascript
    const { Client, LinkingMethod } = require("mywajs")
    const client = new Client({
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
  b

    ```

2. Add the `size-limit` section and the `size` script to your `package.json`:

    ```diff
    + "size-limit": [
    +   {
    +     "path": "dist/app-*.js"
    +   }
    + ],
      "scripts": {
        "build": "webpack ./webpack.config.js",
    +   "size": "npm run build && size-limit",
        "test": "vitest && eslint ."
      }
    ```
