/*!
 * feedworker.js
 * Copyright(c) 2017 Samuel Boczek
 * GPL3 Licensed
 */

const WebSocket = require ('ws')

module.exports = feedWorkerInit

const STATUS_NEW_FEED = 2

/**
 * Wywołaj serverLoadNews () co 10 sekund
 *
 * @param {Object} [serverConnector]
 * @param {Array} [FEED_DB]
 * @param {Object} [webSocket]
 * @public
 */

function feedWorkerInit (serverConnector, FEED_DB, webSocket) {
  setInterval (() => {
    serverConnector.serverLoadNews (() => {}, (feedChunk) => {
      if (feedChunk.length > 0) {
        webSocket.clients.forEach ((socket) => {         // Nowe Feed-y odrazu wysyłamy do Client-ów
          if (socket.readyState === WebSocket.OPEN) {
            socket.send (JSON.stringify({
              status: STATUS_NEW_FEED,
              feed: feedChunk
            }))
          }
        })
        for (var i = 0; i < feedChunk.length; i++) {
          FEED_DB.unshift (feedChunk[i])
        }
      }
    })
  }, 10000)
  
  return module.exports
}




