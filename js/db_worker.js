// This is the worker side of the web worker boundary.

var functions = {
  exec: function(args) {
    var query = args[0];
    var id = args[1];
    var only_train = args[2];
    var on_data = function(data, err) {
      sendMessage({'m':'exec', 'r':{'id': id, 'data':data, 'err':err}});
    }
    var ret = database.execute(query, on_data, only_train);
    return {'id': id, 'ret': ret};
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

addEventListener("message", function(event) {
  try {
    var data = JSON.parse(event.data);
    if (data && data['m'] && data['a']) {
      var func = functions[data['m']];
      var resp = func(data['a']);
      sendMessage({'m':data['m'], 'r':resp});
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