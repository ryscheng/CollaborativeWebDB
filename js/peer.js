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
    database.listeners['get_hash'] = server.retrieve;
    database.listeners['announce_hash'] = server.announce_hash;

    // Create a server socket.
	new WebP2PConnection().getId();
	window._WebP2PServer.onAccept = node.onPeerConnect;
	return true;
  },
 
  announce_hash: function(hashQueryPair, result) {
    return result(server.write({"event": "set",
                                "key": hashQueryPair["hash"]}));
  }, 

  retrieve: function(req, result) {
    server.peers_for_hash(req, function(peers) {
      if (!peers.length) {
        result(null);
      } else {
        var p = node.get_connected(peers);
        if (p) {
          if (evaluation) {
            evaluation.countPeer(p);
          }
          server.data_from_peer(p, req, result);
        } else {
          //todo: allow on demand connection establishment.
          result(null);
        }
        result(null);
      }
    });
  },
  
  peers_for_hash: function(req, result) {
    var key = req.hash;
    log.write("Looking up " + key);
    if (server.waiters[key + ".cache"]) {
      return result(server.waiters[key + ".cache"]);
    }
    if(server.write({"event":"get", "key":key})) {
      if (server.waiters[key]) {
        server.waiters[key].push(result);
      } else {
        server.waiters[key] = [result];
      }
    } else {
      result([]);
    }
  },
  data_from_peer: function(peer, req, result) {
    var key = req.hash;
    log.write("Getting data for " + key);
    var datakey = peer.sid + "_" + key;
    if(server.waiters[datakey]) {
      sever.waiters[datakey].push(result);
    } else {
      server.waiters[datakey] = [result];
      peer.send(JSON.stringify({"event":"get","id":datakey,"key":key}));
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
        this.edges[msg['from']].connect(msg['msg']);
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
        this.maybeConnect_(msg['from'], msg['msg']);
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
  get_connected: function(peers) {
    var filtered = peers.filter(function(peer) {
      return this.edges[peer] !== undefined && this.edges[peer].state == WebP2PConnectionState.CONNECTED;
    }.bind(this));
    return filtered.length? filtered[0] : false;
  },
  onPeerConnect: function(connection) {
    connection.onMessage = function(msg) {
      if (node.edges[msg]) {
        if (node.edges[msg].state == WebP2PConnectionState.CONNECTED && msg < node.id) {
          connection.close();
        } else {
          node.edges[msg].close();
          node.edges[msg] = connection;
          connection.onMessage = node.onPeerMessage.bind(node, msg);
          connection.onStateChange = node.onPeerStateChange.bind(node, msg);
        }
      } else {
        node.edges[msg] = connection;
        connection.onMessage = node.onPeerMessage.bind(node, msg);
        connection.onStateChange = node.onPeerStateChange.bind(node, msg);        
      }
    };
  },
  onPeerStateChange: function(peer, state) {
    if (state == WebP2PConnectionState.STOPPING) {
      var pc = this.edges[peer];
      delete this.edges[peer];
      pc.onMessage = null;
      pc.onStateChange = null;
    }
  },
  onPeerMessage: function(peer, message) {
    var mo;
    try {
      mo = JSON.parse(message);
    } catch(e) {
      log.write("Malformed peer message from " + peer);
      return;
    }
    if (!mo['event']) return;
    if (mo['event'] == 'get') {
      var getter = server.providers[mo['key']];
      if (getter) {
        getter(function(data) {
          log.write('Sending cached data key ' + mo['key'] + ' to ' + peer);
          node.edges[peer].send(JSON.stringify({'event':'resp', 'id':mo['id'], 'status':true, 'data':data}));        
        });
      } else {
        log.write('Asked to provide unavailable data key ' + mo['key'] + ' for ' + peer);
        this.edges[peer].send(JSON.stringify({'event':'resp', 'id':mo['id'], 'status':false}));
      }
    } else if (mo['event'] == 'resp') {
      var waiters = server.waiters[mo['id']];
      if (waiters) {
        delete server.waiters[mo['id']];
        for (var i = 0; i < waiters.length; i++) {
          waiters[i](mo['status'] ? mo['data']: null);
        }
      }
    }
  },
  maybeConnect_:function(id, info) {
    network_pane.saw_node(id);
    if (!this.full()) {
      var pc = new WebP2PConnection();
      if (info) {
        pc.connect(info, function() {
          if (pc.state != WebP2PConnectionState.CONNECTED) {
            server.write({"to":id, "msg": pc.getId()});
          } else {
            pc.send(node.id);
          }
        });
      } else {
        server.write({"to": id, "msg": pc.getId()});
      }
      this.edges[id] = pc;
      pc.onMessage = node.onPeerMessage.bind(node, id);
      pc.onStateChange = node.onPeerStateChange.bind(node, id);
    }
  },
};
