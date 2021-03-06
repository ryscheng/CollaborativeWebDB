var WebP2PConnectionState = {
  NEW: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  LISTENING: 3,
  STOPPING: 4,
  STOPPED: 5
};

var WebP2PCommands = {
  createsocket: 0,
  connect: 1,
  read: 2,
  write: 3,
  disconnect: 4,
  destroy: 5,
  getpublicip: 6,
  createserversocket: 7,
  listen: 8,
  accept: 9,
  stoplistening: 10,
  destroyserversocket: 11
};

var WebP2PConnectionSettings = {
  DEFAULT_PORT: 10000 + Math.floor(Math.random()*30000),
  channel: null
};

window._WebP2PServer = null;

var WebP2PConnection = function(id) {
  this.sid = id;
  this.state = id ? WebP2PConnectionState.CONNECTED : WebP2PConnectionState.NEW;

  this._cbid = 0;
  this._cbr = {};
  this.rtt = 1000; // default to 1 second latency.
  window.addEventListener("message", this._receiveCommand.bind(this), false);
  if (this.state == WebP2PConnectionState.CONNECTED) {
    this._receive();
  }
};

WebP2PConnection.prototype.getId = function() {
  if (!window._WebP2PServer) {
    window._WebP2PServer = new WebP2PConnection(null);
    window._WebP2PServer.connect();
  }
  if (window._WebP2PServer.state != WebP2PConnectionState.LISTENING) {
    return undefined;
  } else {
    return window._WebP2PServer._addr + "|" + WebP2PConnectionSettings.DEFAULT_PORT;
  }
}

WebP2PConnection.prototype.connect = function(otherid, done) {
  //console.log('asked to connect to ' + otherid);
  if (this.state != WebP2PConnectionState.NEW) {
    return;
  }
  var parts = otherid ? otherid.split("|") : [0,0];
  var host = parts[0];
  var port = parseInt(parts[1]);

  if (!window._WebP2PServer) {
    window._WebP2PServer = new WebP2PConnection(null);
    window._WebP2PServer.connect();
  } else if (this == window._WebP2PServer) {
    //console.log('starting listener');
    this._onListen = [];
    this._transition(WebP2PConnectionState.CONNECTING);
    this._getPublicIp(function(msg) {
      this._addr = msg.result;
      this._createServerSocket(function(msg) {
        if (msg.result == 0) {
          this.sid = msg.ssocketId;
          this._listen(WebP2PConnectionSettings.DEFAULT_PORT, function(msg) {
            if (msg.result != 0) {
              this._transition(WebP2PConnectionState.STOPPED);
              return;
            }
            this._transition(WebP2PConnectionState.LISTENING);
            for (var i = 0; i < this._onListen.length; i++) {
              this._onListen[i]();
            }
            this._onListen = [];
            this._receive = function() {
              if (this.state != WebP2PConnectionState.LISTENING) {
                return;
              }
              this._accept(function(msg) {
                if (msg.socketId) {
                  var cs = new WebP2PConnection(msg.socketId);
                  this.onAccept && this.onAccept(cs);
                  window.setTimeout(this._receive.bind(this), 0);
                }
              }.bind(this));
            };
            this._receive();
          }.bind(this));
        } else {
          //console.log(msg);
          this._transition(WebP2PConnectionState.STOPPED);
        }
      }.bind(this));
    }.bind(this));
    return;
  }

  if (!done) {
    done = function() {};
  }
  this.sid = -1 * Math.random();
  this._transition(WebP2PConnectionState.CONNECTING);
  var connectFunction = function(cb) {
    this._createSocket(function(msg) {
      if (msg.socketId !== undefined) {
        this.sid = msg.socketId;
        this._connect(host, port, function(msg) {
          if (msg.result == 0) {
            this._transition(WebP2PConnectionState.CONNECTED);
            this._receive();
          } else {
            //console.log(msg);
            this._transition(WebP2PConnectionState.STOPPED);
          }
          cb();
        }.bind(this));
      } else {
        this._transition(WebP2PConnectionState.STOPPED);
        cb();
      }
    }.bind(this));
  }.bind(this);
  if (window._WebP2PServer.state != WebP2PConnectionState.LISTENING) {
    window._WebP2PServer._onListen.push(connectFunction.bind(this, done));
  } else {
    connectFunction(done);
  }
};

WebP2PConnection.prototype.close = function() {
  if (this.state == WebP2PConnectionState.CONNECTED) {
    this.send("");
    this._transition(WebP2PConnectionState.STOPPING);
    this._disconnect(function() {
      this._transition(WebP2PConnectionState.STOPPED);
      this._destroy(function() {});
    }.bind(this));
  } else if (this.state == WebP2PConnectionState.STOPPING) {
    this._disconnect(function() {
      this._transition(WebP2PConnectionState.STOPPED);
      this._destroy(function() {});
    }.bind(this));
  } else if (this.state == WebP2PConnectionState.LISTENING) {
    this._transition(WebP2PConnectionState.STOPPING);
    this._stoplistening(function() {
      this._transition(WebP2PConnectionState.STOPPED);
      this._destroyServerSocket(function() {});
    }.bind(this));
  } else if (this.state == WebP2PConnectionState.CONNECTING) {
    this._transition(WebP2PConnectionState.STOPPED);
  }
  window.removeEventListener("message", this._receiveCommand, false);
};

WebP2PConnection.prototype.send = function(msg) {
  if (this.state != WebP2PConnectionState.CONNECTED) {
    return false;
  }
  var length = JSON.stringify([msg]).length - 4;
  var llength = (length + "").length;
  if (llength > 9) {
    //console.log("Message too long!");
    return false;
  } else if (length == 0) {
    llength = "";
  }
  this._write(llength + "" + length + "" + msg, function(msg) {
    if (msg.result && msg.result < 0) {
      this.onError && this.onError(msg);
    }
  }.bind(this));
  return true;
};

WebP2PConnection.prototype.onMessage = null;
WebP2PConnection.prototype.onStateChange = null;
WebP2PConnection.prototype.onError = null;


WebP2PConnection.prototype._receive = function() {
  if (this.state != WebP2PConnectionState.CONNECTED) {
    return;
  }

  this._read(1, function(msg) {
    if (msg.data && this.state == WebP2PConnectionState.CONNECTED) {
      var msglen = parseInt(msg.data);
      if (msglen == 0) {
        if (this.state == WebP2PConnectionState.CONNECTED) {
          this._transition(WebP2PConnectionState.STOPPING);
          this.close();
        }
        return;
      }
      this._read( msglen, function(msg) {
        if (msg.data && this.state == WebP2PConnectionState.CONNECTED) {
          var msglen = parseInt(msg.data);
          this._read( msglen, function(msg) {
            if (msg.data) {
              this.onMessage(msg.data);
              window.setTimeout(this._receive.bind(this), 0);
            } else {
              //console.log('could not read peer message');
            }
          }.bind(this));
        } else {
          window.setTimeout(this._receive.bind(this), 0);
        }
      }.bind(this));
    } else {
      window.setTimeout(this._receive.bind(this), 0);
    }
  }.bind(this));
};

WebP2PConnection.prototype._transition = function(state) {
  if (this.state != state) {
    this.state = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }
};

WebP2PConnection.prototype._createSocket = function(callback) { //sockid
  this._sendCommand({command: WebP2PCommands.createsocket}, callback);
};
WebP2PConnection.prototype._connect = function(host, port, callback) {
  this._sendCommand({command: WebP2PCommands.connect, socketId: this.sid, host: host, port: port}, callback);
};
WebP2PConnection.prototype._read = function(bytes, cb) {
  this._sendCommand({command: WebP2PCommands.read, socketId: this.sid, numBytes: bytes}, cb);
};
WebP2PConnection.prototype._write = function(data, callback) {
  this._sendCommand({command: WebP2PCommands.write, socketId: this.sid, data: data}, callback);
};
WebP2PConnection.prototype._disconnect = function(callback) {
  this._sendCommand({command: WebP2PCommands.disconnect, socketId: this.sid}, callback);
};
WebP2PConnection.prototype._destroy = function(callback) {
  this._sendCommand({command: WebP2PCommands.destroy, socketId: this.sid}, callback);
};
WebP2PConnection.prototype._getPublicIp = function(callback) {
  this._sendCommand({command: WebP2PCommands.getpublicip}, callback);
};
WebP2PConnection.prototype._createServerSocket = function(callback) {
  this._sendCommand({command: WebP2PCommands.createserversocket}, callback);
};
WebP2PConnection.prototype._listen = function(port, callback) {
  this._sendCommand({command: WebP2PCommands.listen, ssocketId: this.sid, port: port}, callback);
};
WebP2PConnection.prototype._accept = function(callback) { //sockid
  this._sendCommand({command: WebP2PCommands.accept, ssocketId: this.sid}, callback);
};
WebP2PConnection.prototype._stoplistening = function(callback) {
  this._sendCommand({command: WebP2PCommands.stoplistening, ssocketId: this.sid}, callback);
};
WebP2PConnection.prototype._destroyServerSocket = function(callback) {
  this._sendCommand({command: WebP2PCommands.destroyserversocket, ssocketId: this.sid}, callback);
};


WebP2PConnection.prototype._sendCommand = function(msg, cb) {
  msg.cbid = this._cbid++;
  msg.peer = this.sid;
  this._cbr[msg.cbid] = cb;
  if (WebP2PConnectionSettings.channel) {
    WebP2PConnectionSettings.channel.contentWindow.postMessage({to: "extension", msg: msg}, "*");
  }
};

WebP2PConnection.prototype._receiveCommand = function(event) {
  if (event.data && event.data.to && event.data.to == "page" &&
      event.data.msg.request.peer === this.sid) {
    if (this._cbr[event.data.msg.request.cbid] && typeof this._cbr[event.data.msg.request.cbid] == 'function') {
      this._cbr[event.data.msg.request.cbid](event.data.msg);
      delete this._cbr[event.data.msg.request.cbid];
    } // messages do duplicate, it appears?
  }
};
