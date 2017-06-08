$(document).ready(function (){
  
  const STATUS_PING                   = 0
  const STATUS_REQUEST_FEED           = 1
  const STATUS_NEW_FEED               = 2
  const STATUS_INTERNAL_SERVER_ERROR  = 3
  
  var lastFeedIndex = 0
  var waitingForAnswer = false
  
  // Połącz się z WebSocket Proxyman-a
  feedSocket = new WebSocket("ws://localhost:3000/")
  feedSocket.onmessage = function (event) {
    var data = JSON.parse(event.data)
    
    // Proxyman nas pinguje - musimy odpowiedzieć albo nas wyrzuci/zabije
    if (data.status == STATUS_PING) {
      feedSocket.send (JSON.stringify({
        status: STATUS_PING
      }))
    }
    
    // Nowe Feed-y! Pokaż je odrazu na stronie!
    if (data.status == STATUS_REQUEST_FEED) {
      data.feed.forEach (function (element) {
        $('#feed-container').append('\
        <div class="feed">\
        <div class="feed-votebar">\
        <div class="feed-votebar-button">\
        <i class="fa fa-heart" aria-hidden="true"></i>\
        </div>\
        <div class="feed-votebar-button">\
        <i class="fa fa-heart-o" aria-hidden="true"></i>\
        </div>\
        </div>\
        <div class="feed-content">\
        <div class="feed-authorbar">\
        <img src=http://koziol12.16mb.com/'+element.userImage+'>\
        <div class="feed-authorbar-name">'+element.userName+'</div>\
        <div class="feed-authorbar-date">'+element.date+'</div>\
        </div>\
        '+element.content+' \
        </div>\
        </div>\
        ')
      })
      lastFeedIndex += data.feed.length
      waitingForAnswer = false
    }
    
    // Nowe Feed-y! Pokaż je odrazu na stronie!
    if (data.status == STATUS_NEW_FEED) {
      data.feed.forEach (function (element) {
        $('#feed-container').prepend('\
        <div class="feed">\
        <div class="feed-votebar">\
        <div class="feed-votebar-button">\
        <i class="fa fa-heart" aria-hidden="true"></i>\
        </div>\
        <div class="feed-votebar-button">\
        <i class="fa fa-heart-o" aria-hidden="true"></i>\
        </div>\
        </div>\
        <div class="feed-content">\
        <div class="feed-authorbar">\
        <img src=http://koziol12.16mb.com/'+element.userImage+'>\
        <div class="feed-authorbar-name">'+element.userName+'</div>\
        <div class="feed-authorbar-date">'+element.date+'</div>\
        </div>\
        '+element.content+' \
        </div>\
        </div>\
        ')
      })
      lastFeedIndex += data.feed.length
    }
    
  }
  
  // Ładuj Feed-y jak przewijasz stronę
  $('#feed-container').scroll(function() {
    if($('#feed-container')[0].scrollHeight - ($('#feed-container').scrollTop() - 12) == $('#feed-container').outerHeight()) {
      if (!waitingForAnswer) {
        waitingForAnswer = true
        feedSocket.send (JSON.stringify({
          status: STATUS_REQUEST_FEED,
          from: lastFeedIndex,
          to: lastFeedIndex+7
        }))
      }
    }
  });
  
})
