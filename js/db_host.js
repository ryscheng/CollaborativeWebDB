// This is the host side of the web worker boundary.

var database = {
  worker: null,
  c: 0,
  data_cbs: [],
  completion_cbs: [],
  backing_cbs: [],
  provided_cbs: {}, 
  pcb_id: 0,
  status_cb: null,
  exec: function(query, only_train, data_cb, completion_cb, page) {
    var i = database.c++ || 0;
    database.data_cbs[i] = data_cb;
    database.completion_cbs[i] = completion_cb;
    database.worker.contentWindow.postMessage(JSON.stringify({'m':'exec', 'a':[query, i, only_train, page]}), "*");
  },
  backing: function(cb) {
    database.backing_cbs.push(cb);
    if (database.backing_cbs.length == 1) {
      database.worker.contentWindow.postMessage(JSON.stringify({'m':'q', 'a':[]}), "*");
    }
  },
  getProvidedData: function(key, cb) {
    database.provided_cbs[database.pcb_id] = cb; 
    database.worker.contentWindow.postMessage(JSON.stringify({'m':'get_provided', 'a':key, 'id':database.pcb_id}), "*");
    database.pcb_id++;
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
  listeners: {},
  _msg: function(event) {
    try {
      if (typeof event.data !== 'string') {
        return;
      }
      var data = JSON.parse(event.data);
      if (data && data['m']) {
        console.log('message from db:' + event.data);
        if (data['m'] == 'exec') {
          if (data['r']['ret'] !== undefined) {
            var id = data['r']['id'];
            delete database.data_cbs[id];
            database.completion_cbs[id](data['r']['ret']);
            delete database.completion_cbs[id];
          } else if (data['r']['id'] !== undefined) {
            database.data_cbs[data['r']['id']](data['r']['data'], data['r']['err']);
          }
        } else if (data['m'] == 'q') {
          var qcb = database.backing_cbs;
          database.backing_cbs = [];
          for (var i = 0; i < qcb.length; i++) {
            qcb[i](data['r']);
          }
        } else if (data['m'] == 'log') {
          log.write(data['r']);
        } else if (data['m'] =='error') {
          database._err(data['r']);
        } else if (data['m'] =='set') {
          database[data['r'][0]] = data['r'][1];
        } else if (data['m'] in database.listeners) {
          var id = data['id'];
          database.listeners[data['m']](data['r'], function(arg) {
            database.worker.contentWindow.postMessage(JSON.stringify({'cb':id,'r':arg}), "*");
          });
        }
        else if (data['m'] == 'get_provided') {
          var pcb_id = data['id'];
          database.provided_cbs[pcb_id](data['r']);
        }
        else {
          database.status_cb && database.status_cb(data['r']);
        }
      } else {
        database._err(event.data);
      }
    } catch (e) {
      //console.log(e);
      database._err(e.stack);
    }
  },
  _err: function(e) {
    //console.log(e);
    log.warn("error received from database: " + e);
    database.error = e;
  }
};
