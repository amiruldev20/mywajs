[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#table-of-contents)
# MYWAJS - HOME
[COMMUNITY - CLICK HERE](https://chat.whatsapp.com/BIHE3USWr4lAnahwJTQEOX)

```
thanks in advance to whatsapp-web.js and wpp,
for allowing re-modification. 
and thanks also to those of you who have used mywajs, 
I made this only to make it easier for users, 
there is no other purpose.
```


> *INFO*: below is full mywajs documentation


<details>
   <summary>Client Configuration (local auth)</summary>
  
  > follow the client configuration below to use mywajs
  > ```sh
  > const mywa = new Client({
  >      authStrategy: new mywajs.LocalAuth(),
  >      playwright: {
  >         headless: true,
  >         devtools: false,
  >         args: [
  >             '--aggressive-tab-discard',
  >             '--disable-accelerated-2d-canvas',
  >             '--disable-application-cache',
  >             '--disable-cache',
  >             '--disable-dev-shm-usage',
  >             '--disable-gpu',
  >             '--disable-offline-load-stale-cache',
  >             '--disable-setuid-sandbox',
  >             '--disable-setuid-sandbox',
  >             '--disk-cache-size=0',
  >             '--ignore-certificate-errors',
  >             '--no-first-run',
  >             '--no-sandbox',
  >             '--no-zygote',
  >         ],
  >         bypassCSP: true,
  >     },
  >     markOnlineAvailable: true,
  >     qrMaxRetries: 6,
  >     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
  >     takeoverTimeoutMs: 'Infinity',
  >     clearSessions: true
  >  })
  > ```
  > explanation:
  > 1. ```const mywa = new Client({ ... })``` This line creates a new instance of the WhatsApp client using the Client class from the MyWa library. It takes an object as an argument that contains various options for configuring the client.
  > 2. ```authStrategy: new mywajs.LocalAuth()``` This sets the authentication strategy to use for the client. In this case, it is using the LocalAuth strategy from the MyWa library.
  > 3. ```playwright: { ... }``` This sets the options for the underlying Playwright library that MyWa uses for interacting with the WhatsApp web interface. It configures Playwright to run in headless mode without a visible browser window, and to disable various features that may impact performance or security.
  > 4. ```headless: true``` function to run the browser headless
  > nb: headless: false to run chromium live
  > 5. ```devtools: false``` functions to disable devtools on the browser.
  > 6. ```markOnlineAvailable: true``` This sets the client to automatically appear as online and available to contacts.
  > 7. ```qrMaxRetries``` This sets the maximum number of times the client will retry scanning a QR code before giving up.
  > 8. ```userAgent``` This sets the user agent string that the client will use when making requests to the WhatsApp web interface.
  > 9. ```takeoverTimeoutMs: 'Infinity'``` This sets the amount of time that the client will wait before timing out when attempting to take over an existing session.
  > 10. ```clearSessions: true``` This sets the client to automatically clear any existing sessions when starting up.
  > NB: only works if using the default session folder
  </details>
  
<details>
   <summary>Client Configuration (linked phone)</summary>
  
  > follow the client configuration below to use mywajs
  > ```sh
  > const mywa = new Client({
  >      linkingMethod: new mywajs.LinkingMethod({
  >        phone: {
  >               number: "62851xx"
  >               },
  >      }),
  >      playwright: {
  >         headless: true,
  >         devtools: false,
  >         args: [
  >             '--aggressive-tab-discard',
  >             '--disable-accelerated-2d-canvas',
  >             '--disable-application-cache',
  >             '--disable-cache',
  >             '--disable-dev-shm-usage',
  >             '--disable-gpu',
  >             '--disable-offline-load-stale-cache',
  >             '--disable-setuid-sandbox',
  >             '--disable-setuid-sandbox',
  >             '--disk-cache-size=0',
  >             '--ignore-certificate-errors',
  >             '--no-first-run',
  >             '--no-sandbox',
  >             '--no-zygote',
  >         ],
  >         bypassCSP: true,
  >         userDataDir: ".mywajs_auth"
  >     },
  >     markOnlineAvailable: true,
  >     qrMaxRetries: 6,
  >     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
  >     takeoverTimeoutMs: 'Infinity'
  >  })
  > ```
  > explanation:
  > 1. ```const mywa = new Client({ ... })``` This line creates a new instance of the WhatsApp client using the Client class from the MyWa library. It takes an object as an argument that contains various options for configuring the client.
  > 2. ```authStrategy: new mywajs.LingkingMethod()``` a new method to login from a number, without the need for a qr scan
  > 3. ```playwright: { ... }``` This sets the options for the underlying Playwright library that MyWa uses for interacting with the WhatsApp web interface. It configures Playwright to run in headless mode without a visible browser window, and to disable various features that may impact performance or security.
  > 4. ```headless: true``` function to run the browser headless
  > nb: headless: false to run chromium live
  > 5. ```devtools: false``` functions to disable devtools on the browser.
  > 6. ```markOnlineAvailable: true``` This sets the client to automatically appear as online and available to contacts.
  > 7. ```qrMaxRetries``` This sets the maximum number of times the client will retry scanning a QR code before giving up.
  > 8. ```userAgent``` This sets the user agent string that the client will use when making requests to the WhatsApp web interface.
  > 9. ```takeoverTimeoutMs: 'Infinity'``` This sets the amount of time that the client will wait before timing out when attempting to take over an existing session.
  > 10. ```userDataDir: 'path'``` path session
  > NB: only works if using the default session folder
  </details>
  
  <details>
   <summary>Event Get Code Login</summary>
  
  > add this after your client creation to detect login code in console
  > ```sh
  > mywa.on("code", (mcode) => {
  > console.log(`Your Code: ${mcode}`);
  > })
  >```
  
  
  
  
  
  
