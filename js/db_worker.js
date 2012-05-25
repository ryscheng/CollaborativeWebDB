// This is the worker side of the web worker boundary.

var functions = {
  exec: function(args) {
    var query = args[0];
    var id = args[1];
    var only_train = args[2];
    var page = args[3];

    // 2 messages will be sent: the first will contain data, the second return
    // status.  When the execute call returns early, we save the return value
    // in data_sent, and it is send later in the subsequent on_data call.
    var data_sent = false;
    var on_data = function(data, err) {
      sendMessage({'m':'exec', 'r':{'id': id, 'data':data, 'err':err}});
      if (data_sent) {
        sendMessage({'m':'exec', 'r':data_sent});
      } else {
        data_sent = true;
      }
    }
    var ret = database.execute(query, on_data, only_train, page);
    if (data_sent) {
      return {'id': id, 'ret': ret};
    } else {
      data_sent = {'id': id, 'ret': ret};
      return {};
    }
  },
  q: function() {
    var t = {};
    for (var table in database.source) {
      var d = database.source[table];
      t[table] = {name: d.name, colnames: d.colnames, cols: d.cols};
    }
    return t;
  }
};

var Host = {
  cbs: function(cb, deleteAfterCalling) {
    if (!Host._cbid) {
      Host._cbid = 0;
      Host._cbr = {};
    }
    var id = Host._cbid++;
    Host._cbr[id] = function(arg) {delete Host._cbr[id]; cb(arg) };
    return id;
  },
  prop: function(key, val) {
    sendMessage({'m':'set','r':[key,val]});
  },
  log: function(msg) {
    sendMessage({'m':'log','r':msg});
  },
  get_hash: function(hash, cb) {
    sendMessage({'m':'get_hash',
                 'r':{'hash':hash}, 
                 'id':Host.cbs(cb, true)});
  },
  announce_hash: function(hashQueryPair, pageHandler) {
    sendMessage({'m': 'announce_hash',
                 'r': hashQueryPair,
                 'id': Host.cbs(pageHandler, false)});
  }
  
};

addEventListener("message", function(event) {
  try {
    var data = JSON.parse(event.data);
    if (data && data['m'] && data['a']) {
      var func = functions[data['m']];
      var resp = func(data['a']);
      sendMessage({'m':data['m'], 'r':resp});
    } else if (data && data['cb'] !== undefined && data['r'] !== undefined) {
      Host._cbr[data['cb']](data['r']);
    } else {
      sendMessage({'m':'error', 'r': event.data});
    }
  } catch(e) {
    sendMessage({'m':'error', 'r':e.stack});
  }
}, false);

sendMessage = function(msg) {
  if (top) {
    top.postMessage(JSON.stringify(msg), "*");
  } else {
    postMessage(JSON.stringify(msg));
  }
};
