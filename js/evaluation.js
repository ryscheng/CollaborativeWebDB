var evaluation = {
  socket: null,

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
  },

  start: function() {
    console.debug('creating websocket for eval');
    var url = "ws://" + location.host + "/evalWS";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    console.debug(this.socket);

    var that = this;
    this.socket.onmessage = function(event) {
      //do whatever we want to do when we get a message from the server... for now print it
      console.debug(event);
    }
    return true;
  }
}

evaluation.start();
setTimeout(function() {
  evaluation.write({"command": "start"});
}, 8000);
