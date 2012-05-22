// Adapted from the tornado webchat demo.
var server = {
  socket: null,
  subscribers: [],
  waiters: {},
  providers: {},

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
  },
  
  lookup: function(key, result) {
    log.write("Looking up " + key);
    if(server.write({"event":"get", "key":key})) {
      if (server.waiters[key + ".cache"]) {
        return result(server.waiters[key + ".cache"]);
      }
      if (server.waiters[key]) {
        server.waiters[key].push(result);
      } else {
        server.waiters[key] = [result];
      }
    } else {
      result([]);
    }
  },
  provide: function(key, getter) {
    log.write("Providing " + key);
    if(server.write({"event":"set","key":key})) {
      server.providers[key] = getter;
    }
  }
};

var node = {
  edges:{},
  MAX_EDGES: 20,
  onServerMessage: function(msg) {
    if (msg['from'] === 0)
    {
      if (msg['id'] && !this.id && msg['event'] == "register") {
        // Registration complete.
        this.id = msg['id'];
        log.write("Registered with server as " + this.id);
        // todo: consider announces on a timer or when deficient degree.
        server.write({
          event:'announce'
        });
      } else if (msg['event'] == 'disconnect') {
        delete this.edges[msg['id']];
        network_pane.drop_node(msg['id']);
      } else if (msg['event'] == 'list') {
        var key = msg['key'];
        var result = msg['ids'];
        server.waiters[key + ".cache"] = result;
        var callback = server.waiters[key];
        delete server.waiters[key];
        for (var i = 0; i < callback.length; i++) {
          callback[i](result);
        }
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
    network_pane.saw_node(id);
    if (!this.full()) {
      // todo: true channel setup integration.
      var pc = new webkitPeerConnection00("STUN stun.l.google.com:19302", this.send_.bind(this, id));
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