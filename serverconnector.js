/*!
 * cookie-parser
 * Copyright(c) 2017 Samuel Boczek
 * GPL3 Licensed
 */

const jqInit           = require ('jquery')
const cookie           = require ('cookie')
const JSDOM            = require ('jsdom').JSDOM
const http             = require ('http')

const SERVER_ADDRESS   = 'koziol12.16mb.com'
const SERVER_CONNECTOR = {
  serverLoadNews: serverLoadNews,
  serverLoadFeedsUntil: serverLoadFeedsUntil,
  serverAuthenticateToken: serverAuthenticateToken,
  serverAuthenticateUser: serverAuthenticateUser
}

var PROXYMEN_TOKEN     = null;

module.exports = serverConnectionInit

/**
 * Odwołując się do pliku "/php/post_loader/load_first.php"
 * i ustawiając ciasteczko o nazwie PHPSESSID na Token Proxymen-a
 * mogę pobrać 7 najnowszych Feed-ów z Server-a, zresetuje mi to też
 * licznik dla Tokenu Proxymen-a, dzięki temu będę
 * mógł się później odwoływać do "/php/post_loader/load_next.php"
 * aby ładować starsze Feed-y z Server-a.
 *
 * @param {String} [token]
 * @param {Function} [error]
 * @param {Function} [success]
 * @public
 */

function serverConnectionInit (token, error, success) {
  PROXYMEN_TOKEN = token
  let options = {
    hostname: SERVER_ADDRESS,
    path: '/php/post_loader/load_first.php',
    headers: {
      Cookie: 'PHPSESSID=' + PROXYMEN_TOKEN
    }
  }
  let body = ''
  
  http.request (options, (response) => {
    response.on ('data', (chunk) => {body += chunk})
    response.on ('end', (chunk) => {
      body.length == 0 ? error ('EMPTY RESPONSE') : serverFeedProcessor (body, error, success)
    })
  }).end ()
  
  return SERVER_CONNECTOR
}

/**
 * Odwołując się do pliku "/php/post_loader/load_news.php"
 * sprawdzam czy nie ma jakichś nowych Feed-ów.
 *
 * @param {Function} [error]
 * @param {Function} [success]
 * @public
 */

function serverLoadNews (error, success) {
  let options = {
    hostname: SERVER_ADDRESS,
    path: '/php/post_loader/load_news.php',
    headers: {
      Cookie: 'PHPSESSID=' + PROXYMEN_TOKEN
    }
  }
  let body = ''
  
  http.request (options, (response) => {
    response.on ('data', (chunk) => {body += chunk})
    response.on ('end', (chunk) => {
      body.length == 0 ? error () : serverFeedProcessor (body, error, success)
    })
  }).end ()
}

/**
 * Odwołując się do pliku "/php/post_loader/load_next.php"
 * pobieram więcej Feed-ów z Server-a.
 *
 * @param {Function} [error]
 * @param {Function} [success]
 * @private
 */

function serverLoadMoreFeeds (error, success) {
  let options = {
    hostname: SERVER_ADDRESS,
    path: '/php/post_loader/load_next.php',
    headers: {
      Cookie: 'PHPSESSID=' + PROXYMEN_TOKEN
    }
  }
  let body = ''
  
  http.request (options, (response) => {
    response.on ('data', (chunk) => {body += chunk})
    response.on ('end', (chunk) => {
      body.length == 0 ? error () : serverFeedProcessor (body, error, success)
    })
  }).end ()
}

/**
 * Będzie pobierał Feed-y z Server-a aż zbierze określoną ilość Feed-ów
 *
 * @param {Function} [error]
 * @param {Function} [success]
 * @public
 */

function serverLoadFeedsUntil (feedNumber, FEED_DB, error, success) {
  if (FEED_DB.length < feedNumber) {
    serverLoadMoreFeeds (() => {
      error ()
    }, (feedChunk) => {
      for (var i = 0; i < feedChunk.length; i++) {
        FEED_DB.push(feedChunk[i])
      }
      serverLoadFeedsUntil (feedNumber, FEED_DB, error, success)
    })
  } else {
    success (FEED_DB)
  }
}

/**
 * Prywatna funkcja która dokona anylizy składniowej Feed-a
 * i wyprodukuje object do puźniejszego użytku przez Proxymen-a.
 *
 * @param {Buffer|String} [body]
 * @param {Function} [error]
 * @param {Function} [success]
 * @private
 */

function serverFeedProcessor (body, error, success) {
  const $ = jqInit (new JSDOM(body).window)
  const FEED_DB = []
  
  $('.post_post').each ((index, rawElement) => {
    let element = $ (rawElement)
    let feed = {
      userImage: element.find ('.post_avatar').attr ('src'),
      userName: element.find ('.post_name').html ().replace ("<br>", " "),
      content: element.find ('.post_content').html (),
      date: element.find ('.post_date').html ()
    }
    FEED_DB.push (feed)
  })
  
  $('.post_post').length == 0 ? error ('EMPTY ARRAY') : success (FEED_DB)
}

/**
 * Taki hack, wysałem zapytanie do Server-a, jak odpowiedź będzie
 * o długości równej 17 to znaczy że Token jest prawidłowy i można go używać. 
 *
 * @param {String} [token]
 * @param {Function} [error]
 * @param {Function} [success]
 * @public
 */

function serverAuthenticateToken (token, error, success) {
  let options = {
    host: SERVER_ADDRESS,
    path: '/Logowanie/index.php',
    headers: {
      Cookie: 'PHPSESSID=' + token
    }
  }
  let body = ''
  
  var req = http.request (options, (response) => {
    response.on ('data', (chunk) => {body += chunk})
    response.on ('end', (chunk) => {
      switch (body.length) {
        case 0:
          error ()
          break;
        case 17:
          success (true)
          break;
        default:
          success (false)
      }
    })
  })
  req.end ()
}

/**
 * A to chyba najciekawsza funkcja, umożliwia użytkownikom zalogowanie
 * się do portalu, gdy użytkownik wprowadzi email i hasło w przeglądarce to Proxymen
 * je odbiera i odsyła do Server-a, potem sprawdza token przy pomocy funkcji "serverAuthenticateToken"
 *
 * @param {String} [email]
 * @param {String} [password]
 * @param {Function} [error]
 * @param {Function} [success]
 * @public
 */

function serverAuthenticateUser (email, password, error, success) {
  const REQUEST_BODY = 'Email='+email+'&pass='+password+'&Login='
  let options = {
    hostname: SERVER_ADDRESS,
    path: '/Logowanie/login.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': REQUEST_BODY.length
    }
  }
  
  http.request (options, (response) => {
    try {
      for (var i = 0; i < response.headers['set-cookie'].length; i++) {
        let element = cookie.parse(response.headers['set-cookie'][i])
        if (element.PHPSESSID) {
          serverAuthenticateToken (element.PHPSESSID, error, (ret) => { success (ret, element.PHPSESSID) })
          break;
        }
      }
    } catch (e) {
      error (e)
    }
  }).end (REQUEST_BODY)
}
