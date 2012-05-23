var evaluation = {
  socket: null,
  started: false,

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
  },

  start: function() { console.debug('creating websocket for eval');
    var url = "ws://" + location.host + "/evalWS";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    console.debug(this.socket);

    var that = this;
    this.socket.onmessage = function(event) {
      var msg = JSON.parse(event.data);
      if (msg.command == "start") {
        that.startEvaluation();
      }
      else if (msg.command == "stop") {
        that.stopEvaluation();
      }
      console.debug('received evaluation message: ', event);

    }
    return true;
  },

  nextQuery: function() {
    return "SELECT * FROM my_table";
  },

  startEvaluation: function() {
    this.started = true;
    console.debug('starting testing');
  },

  stopEvaluation: function() {
    this.started = false;
    console.debug('stoping testing');
  }

}

evaluation.start();
