// Adapted from the tornado webchat demo.
var server = {
  socket: null,
  subscribers: [],

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
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

var node = {
  edges:{},
  MAX_EDGES: 20,
  onServerMessage: function(msg) {
    if (msg['from'] === 0)
    {
      if (msg['id'] && !this.id) {
        // Registration complete.
        this.id = msg['id'];
        log.write("Registered with server as " + this.id);
        // todo: consider announces on a timer or when deficient degree.
        server.write({
          event:'announce'
        });
      }
    } else if (msg['from'] && msg['from'] != this.id) {
      if (this.edges[msg['from']]) {
        this.edges[msg['from']].processSignalingMessage(msg['msg']);
        // Continue signalling a peer.
      } else if (msg['event'] && msg['event'] == 'announce') {
        // Initiate connection to a new peer.
        this.maybeConnect_(msg['from']);
      } else if (msg['event'] && msg['event'] == 'decline') {
        if (this.edges[msg['from']]) {
          this.edges[msg['from']].close();
          delete this.edges[msg['from']];
        }
      } else if (msg['msg'] && !this.full()) {
        this.maybeConnect_(msg['from']);
        this.edges[msg['from']].processSignalingMessage(msg['msg']);
      } else {
        server.write({to:msg['from'], event:'decline'});
      }
    }
  },
  full: function() {
    var edge_num = 0;
    for (var i in this.edges) {
      if(this.edges.hasOwnProperty(i)) {
        edge_num++;
      }
    }
    return (edge_num >= this.MAX_EDGES);
  },
  maybeConnect_:function(id) {
    if (!this.full()) {
      // todo: true channel setup integration.
      var pc = new webkitDeprecatedPeerConnection("STUN stun.l.google.com:19302", this.send_.bind(this, id));
      this.edges[id] = pc;
    }
  },
  send_:function(id, msg) {
    server.write({
      to:id,
      msg:msg
    })
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
      server.write({
        event:'register'
      });
    }
    server.subscribers.push(function(msg) {
      log.write("Server Message received: " + JSON.stringify(msg));
    });
    server.subscribers.push(node.onServerMessage.bind(node));
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
}, false);
