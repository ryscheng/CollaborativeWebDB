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
      network_pane.maybe_add_node(id);
    }
  },
  send_:function(id, msg) {
    server.write({
      to:id,
      msg:msg
    })
  }
};