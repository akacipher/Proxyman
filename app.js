/*!
 * app.js
 * Copyright(c) 2017 Samuel Boczek
 * GPL3 Licensed
 */

const cookieParser      = require ('cookie-parser')
const express           = require ('express')
const http              = require ('http')
const path              = require ('path')

const PROXYMEN_TOKEN    = 'fffba7f48d22c3b76e976740c6895e5b'
const PROXYMEN_PORT     = 3000
const FEED_DB           = []

const app               = express ()
const proxymen          = http.createServer (app)

const serverConnector   = require ('./serverconnector.js')(PROXYMEN_TOKEN, serverConnectorError, serverConnectorSuccess)
const webSocket         = require ('./websocket.js')(proxymen, FEED_DB, serverConnector)
const feedWorker        = require ('./feedworker.js')(serverConnector, FEED_DB, webSocket)

function serverConnectorError () {
  console.log('CRITICAL ERROR:')
  console.log('Cannot establish connection with the Server')
  process.exit(1)
}                           // Brak połączenia z Server-em
function serverConnectorSuccess (feedChunk) {
  for (var i = 0; i < feedChunk.length; i++) {
    FEED_DB.push (feedChunk[i])
  }
}                // Mamy połącznie! Zapisz otrzymane Feed-y do FEED_DB

app.use (cookieParser())
app.post ('/login.ajax', (request, response) => {             // Client wysłał prośbę o zalogowanie z email-em i hasłem
  let body = '';
  request.on ('data', (chunk) => {body += chunk})
  request.on ('end', () => {
    if (body.length == 0) {           // Error? Nagłe zerwanie połączenia?
      response.send(JSON.stringify({
        status: 0
      }))
    } else {
      let formData = JSON.parse(body)
      serverConnector.serverAuthenticateUser (formData.email, formData.password, () => {  // Wysyłamy email i hasło do Server-a
        response.send(JSON.stringify({
          status: 0                     // Error? Nie mogę się połączyć z Server-em?
        }))
      }, (success, token) => {
        if (success === true) {
          response.send(JSON.stringify({
            status: 1,                    // Poprawne hasło! Udało się zalogować, wysyłam token Client-owi
            token: token
          }))
        } else {
          response.send(JSON.stringify({
            status: 0                     // Złe hasło lub email :/
          }))
        }
      })
    }
  })
})
app.get ('/', (request, response) => {                        // Client odwiedził naszą stronę
  if (request.cookies.AuthID) {           // Czy client ma już Token?
    serverConnector.serverAuthenticateToken (request.cookies.AuthID, () => {      // Czy to jest ważny Token?
      response.status(500)
      response.send('<h1>Błąd połączenia z Server-em</h1>')
    }, (success) => {
      if (success === true) {
        response.sendFile("index.html", {root: path.join (__dirname, '/LisyUI/') }) // Udało się zalogować, oto nasze sekrety (zawartość strony index.html)
      } else {
        response.sendFile("login.html", {root: path.join (__dirname, '/LisyUI/') }) // Zły Token! Zaloguj się aby otrzymać nowy
      }
    })
  } else {
    response.sendFile("login.html", {root: path.join (__dirname, '/LisyUI/') }) // Client nie miał Token-u
  }
})
app.all ('/((index)|(login)).html', (request, response) => {  // Dzięki temu Client nie może sobie tak po prostu otworzyć index.html lub login.html
  response.status(404);
  response.send('<h1>404</h1>');
})
app.use (express.static('LisyUI'))                            // Automatycznie udostępniaj pliki z folderu "LisyUI"
app.use ((request, response, next) => {                       // To się dzieje jak nie mam co wysłać Client-owi
  response.status(404);
  response.send('<h1>404</h1>');
});

proxymen.listen (PROXYMEN_PORT, () => {                       // Zacznij nasłuchiwanie
  console.log('Proxymen listening on ', PROXYMEN_PORT);
})
