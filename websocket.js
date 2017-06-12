/*!
 * websocket.js
 * Copyright(c) 2017 Samuel Boczek
 * GPL3 Licensed
 */

const cookieParser    = require ('cookie-parser')
const parseCookies    = cookieParser ()
const WebSocket       = require ('ws')

module.exports        = websocketInit
var proxymanSocket    = null
var serverConnector   = null
var FEED_DB           = null

const STATUS_PING                   = 0
const STATUS_REQUEST_FEED           = 1
const STATUS_NEW_FEED               = 2
const STATUS_CREATE_FEED            = 3
const STATUS_INTERNAL_SERVER_ERROR  = 4

/**
 * Aktywuje gniazdo WebSocket dla Proxymen-a
 *
 * @param {Object} [server]
 * @param {Array} [feedDb]
 * @param {Object} [serverConnectorInterface]
 * @public
 */

function websocketInit (server, feedDb, serverConnectorInterface) {
  serverConnector = serverConnectorInterface
  FEED_DB = feedDb
  proxymanSocket = new WebSocket.Server ({ server })
  proxymanSocket.on ('connection', websocketConnection)
  return proxymanSocket
}

/**
 * Tylko Proxyman wywołuje tą funkcję! Jest ona wywoływana w momencie w
 * którym WebSocket Client-a próbuje nawiązać połączenie z WebSocket Proxymen-a 
 *
 * Jeżeli Client nie zalogował się na stronie to połączenie zostanie zerwane.
 *
 * @param {Object} [socket]
 * @param {Object} [request]
 * @private
 */

function websocketConnection (socket, request) {
  parseCookies (request, null, () => {})
  
  if (request.cookies.AuthID) {
    serverConnector.serverAuthenticateToken (request.cookies.AuthID, () => {
      socket.send (JSON.stringify({status: STATUS_INTERNAL_SERVER_ERROR}))
    }, (success) => {
      if (success === true) {
        socket.AuthID = request.cookies.AuthID
        websocketMessage (socket)
      } else {
        socket.terminate ()
      }
    })
  } else {
    socket.terminate ()
  }
}

/**
 * Tylko Proxyman wywołuje tą funkcję! Jest ona wywoływana w momencie w
 * którym WebSocket Client-a próbuje wysyła wiadomośc do WebSocket Proxymen-a
 * Proxymen wtedy odpowiada na ping albo wysyła Feed-y do Client-a
 *
 * @param {Object} [socket]
 * @private
 */

function websocketMessage (socket) {
  
  /* Zaraz po połączeniu wyślij do Client-a 7 pierwszych Feed-ów */
  serverConnector.serverLoadFeedsUntil (7, FEED_DB, () => {}, () => {
    socket.send (JSON.stringify({
      status: STATUS_REQUEST_FEED,
      feed: FEED_DB.slice (0, 7)
    }))
  })
  
  socket.on ('message', (rawData) => {
    try {
      let data = JSON.parse(rawData)
      
      if (data.status == STATUS_PING) {
        socket.isAlive = true
      }
      
      if (data.status == STATUS_REQUEST_FEED) {
        if (data.from < data.to && data.to - data.from < 20) {
          serverConnector.serverLoadFeedsUntil (data.to, FEED_DB, () => {}, () => {
            socket.send (JSON.stringify({
              status: STATUS_REQUEST_FEED,
              feed: FEED_DB.slice (data.from, data.to)
            }))
          })
        }
      }
      
      if (data.status == STATUS_CREATE_FEED) {
        serverConnector.serverSendFeed (data.content, socket.AuthID, () => {}, () => {
          socket.send (JSON.stringify({status: STATUS_CREATE_FEED}))
        })
      }
      
    } catch (e) {}
  })
}

/**
 * Tylko Proxyman wywołuje tą funkcję! Jest ona wywoływana w momencie aktywacji
 * WebSocket Proxyman-a. Zadaniem funkcji jest zabijanie WebSocket
 * Client-ów którzy nie odpowiadają na ping.
 *
 * @private
 */

function webSocketHeatbeat () {
  proxymanSocket.clients.forEach(function each(socket) {
    if (socket.isAlive === false) {
      socket.terminate()
    }
    
    socket.isAlive = false
    socket.send (JSON.stringify({
      status: STATUS_PING
    }))
  });
}
