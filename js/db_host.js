// This is the host side of the web worker boundary.

var database = {
  worker: null,
  data_cbs: [],
  completion_cbs: [],
  backing_cbs: [],
  status_cb: null,
  exec: function(query, only_train, data_cb, completion_cb) {
    var i = database.data_cbs.length || 0;
    database.data_cbs[i] = data_cb;
    database.completion_cbs[i] = completion_cb;
    database.worker.contentWindow.postMessage(JSON.stringify({'m':'exec', 'a':[query, i, only_train]}), "*");
  },
  backing: function(cb) {
    database.backing_cbs.push(cb);
    if (database.backing_cbs.length == 1) {
      database.worker.contentWindow.postMessage(JSON.stringify({'m':'q', 'a':[]}), "*");
    }
  },
  init: function(cb) {
    if(!database.worker) {
      database.worker = document.createElement('iframe');
      database.worker.src = '/data.html';
      window.addEventListener('message', database._msg, false);
      $(database.worker).css('position','absolute').css('width',1).css('height',1).css('left', -100);
      document.body.appendChild(database.worker);
      database.worker.onload = cb;
    }
  },
  _msg: function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data && data['m']) {
        if (data['m'] == 'exec') {
          if (data['r']['ret']) {
            var id = data['r']['id'];
            //delete database.data_cbs[id];
            database.completion_cbs[id](data['r']['ret']);
            //delete database.completion_cbs[id];
          } else {
            database.data_cbs[data['r']['id']](data['r']['data'], data['r']['err']);
          }
        } else if (data['m'] == 'q') {
          var qcb = database.backing_cbs;
          database.backing_cbs = [];
          for (var i = 0; i < qcb.length; i++) {
            qcb[i](data['r']);
          }
        } else {
          database.status_cb && database.status_cb(data['r']);
        }
      } else {
        database._err(event.data);
      }
    } catch (e) {
      console.log(e);
    }
  },
  _err: function(event) {
    console.log(event);
    log.warn(JSON.stringify(event));
  }
};