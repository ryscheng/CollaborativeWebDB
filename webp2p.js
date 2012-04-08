// Adapted from the tornado webchat demo.
var server = {
  socket: null,
  subscribers: [],

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload":obj}));
  },
  
  start: function() {
    var url = "ws://" + location.host + "/message";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    var that = this;
	this.socket.onmessage = function(event) {
	  var msg = JSON.parse(event.data);
      for (var i = 0; i < that.subscribers.length; i++) {
        that.subscribers[i](msg);
      }
	}
	return true;
  }
};

var log = {
  start: function(vis) {
    this.el = document.createElement("pre");
    this.el.id = "webp2p_log";
    if (vis) {
      document.body.appendChild(this.el);
    }
  },
  write: function(msg) {
    $(this.el).append(msg + "\n\r");
  }
};

window.addEventListener('load', function() {
  //Replace the source of the video element with the stream from the camera
  navigator.getUserMedia_ = navigator.getUserMedia || navigator.webkitGetUserMedia;
  if(!!navigator.getUserMedia_ !== false) {
    var peerConnection = window.webkitDeprecatedPeerConnection;
    if (!peerConnection) {
      $('#output').html('Sorry, your browser doesn\'t support a functional peer connection. ')
        .append('<p>Try Chrome canary or dev channel.</p>');
      return;
    }

    log.start(window.DEBUG);
    log.write("Connecting to server.");
    server.start();
    server.socket.onopen = function() {
      log.write("Connected to server.");
    }
    server.subscribers.push(function(msg) {
      log.write("Server Message received: " + JSON.stringify(msg));
    });
  } else {
    console.log('Native web camera streaming (getUserMedia) is not supported in this browser.');
    $('#output').html('Sorry, your browser doesn\'t support getUserMedia. ')
      .append('<p>Try Chrome canary or dev channel ')
      .append('with enabling MediaStream at chrome://flags ')
      .append('(To be sure that it is now experimental ')
      .append("and don't forget to set --enable-media-stream ")
      .append("as a execute parameter)")
      .append('</p>')
    return;
  }
},false);
