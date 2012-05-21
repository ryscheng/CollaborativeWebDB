var database = {
  page_width: 30,
  source: null,
  handle: null,
  _training: false,
  _blocked: [],
  
  execute: function(query, callback, only_train) {
    if (database._blocked !== false) {
      database._blocked.push(function() {
        database.execute(query, callback);
      });
      if (database.source == null)
        return database.init();
      return "Currently Initializing";
    }

    if (!query.length) {
      return callback(null, "No Query");
    }
    database._training = true;
    try {
      return database.handle.exec(query, database._cost.bind(this, query, callback, only_train));
    } catch(e) {
      database._reset();
      callback(null, e);
      return;
    }
  },
  
  _cost: function(query, callback, only_train, answer) {
    callback(answer, null);
  /*
    var result_cost = 0;
    var table_cost = 0;
    var row = 0;
    enumerable.take(5).each(function(i) {row++});
    if (row < 5) {
      result_cost = 1;
    }
    for (var i in database.source) {
      var t = database.source[i];
      var indicies = 0;
      for (var d in t.dirty) {
        indicies++;
      }
      t._access_mode = indicies;
      if (indicies > 0 && indicies <= 6) {
        table_cost += 1;
      } else if (indicies > 6) {
        table_cost += 5;
      }
    }
    row = 0;
    enumerable.each(function(i) {row++});
    if (row > 10) {
      result_cost += 5;
    } else {
      result_cost += 1;
    }
    
    var semaphore = 0;
    var continuation = function() {
      semaphore--;
      if (semaphore == 0) {
        // Tables loaded.
        database._reset();
        try {
          var q = new jsinq.Query(query);
          var e = q.getQueryFunction()(database.source);
          callback(e, null);
        } catch (err) {
          callback(null, err);
        }
      }
    }

    console.log("r: " + result_cost + "t:" + table_cost);
    if (result_cost < table_cost) {
      // Store result only.
      log.warn("not implemented :-/");
    } else {
      // Store tables.
      for (var i in database.source) {
        var t = database.source[i];

        if (t._access_mode > 0 && t._access_mode <= 6) {
          semaphore++;
          console.log('page needed from ' + i);
          database.load_page(database.get_page_key(i, 0), function(page) {
            this.store(page);
            continuation();
          }.bind(t));
        } else if (t._access_mode > 0) {
          semaphore++;
          console.log('full table needed from ' + i);
          database.stream_table(i, database.source[i].store, continuation);
        }
      }
    }
    */
  },
  
  _finishSetup: function() {
    var setup = "";
    for (var table in database.source) {
      setup += "create virtual table " + database.source[table].name +
          " using jsbacked;";
    }
    database.handle.exec(setup, database._unblock);
    database._unblock();
  },
  _unblock: function() {
    sendMessage({'m':'stat', 'r':'Database Initialized'});
    var waiters = database._blocked;
    database._blocked = false;
    for (var i = 0; i < waiters.length; i++) {
      waiters[i]();
    }
  },
  _reset: function() {
    database._training = false;
    for (var t in database.source) {
      database.source[t].dirty = {};
    }
  },

  get_page_key: function(table, offset) {
    return {"table": table,
            "offset": offset,
            "hash": table + "." + offset};
  },

  load_page: function(key, callback) {
    if (database.source[key.table] && database.source[key.table][key.hash]) {
        return callback();
    }

    //server.lookup(key.hash, function(peers) {
    //    if (!peers.length) {
            database.load_from_server(key, callback);
    //    } else {
    //        console.log('would get from peers');
    //    }
    //});
  },
  
  ajax: {
        Version: '1.0.0',
	
		request: function(sync,callback,url)
		{
		       var r=(XMLHttpRequest)?new XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP");
		       if(!r) {return false;}
		       if(!sync) {
		               r.onreadystatechange = function() {callback(r);};
		       }
		       r.open("GET", url, !sync);
	           r.send(null);
	           if(!sync) {return true;}
               
	           if(r.responseText) {
	                   return r.responseText;
	           }
	           return "Failed To Load";
	    },
        synchronous: function(url) {
                return database.ajax.request(true,false,url);
        },
        asynchronous: function(url,callback) {
                database.ajax.request(false,callback,url);
                return true;
        }
  },

  load_from_server: function(key, callback) {
    database.ajax.asynchronous("/data?t="+key['table']+"&o="+key['offset'], function(r) {
      if (r.readyState == 4) {
        var actual_data = JSON.parse(r.responseText);
        callback(actual_data);
      }
    });
  },
  
  stream_table: function(table, callback, and_then, offset) {
    if (!offset)
      offset = 0;
    database.load_page(database.get_page_key(table, offset), function(data) {
      if (data['rows'] && data['range'][1] < data['total']) {
        database.stream_table(table, callback, and_then, data['range'][1]);
      }
      callback(data);
      if ((!data['range'] || !data['total'] || data['range'][1] >= data['total']) && and_then) {
        and_then();
      }
    });
  },
  
  types: {
    BLOB: 0,
    DOUBLE: 1,
    ERROR: 2,
    INT: 3,
    INT64: 4,
    TEXT: 5,
    ZEROBLOB: 6,
    NIL: 0x7f
  },
  
  init: function() {
    var build_table_def = function(name, create) {
      var obj = {
        name: name,
        cols: {},
        colnames: [],
        types: [],
        def: create,
        pages: {}
      };
      var rows = create.split('\n');
      for (var i = 1; i < rows.length; i++) {
        if (rows[i].trim().match(/(PRIMARY KEY|UNIQUE|FOREIGN KEY)/))
            continue
        var kv = rows[i].trim().match(/([\S]*)\s+([\S]*)/i);
        if (kv == null || kv.length < 3)
            continue;
        obj.colnames.push(kv[1]);
        obj.cols[kv[1]] = kv[2];
        var type = database.types.INT;
        switch(kv[2].toLowerCase().substr(0,3)) {
          case "int":
          case "dat": //date
          case "boo": //bolean
          case "tim": //timestamp
              break;
          case "cha": //char
          case "var": //varchar
          case "nva": //nvarchar
          case "tex": //text
          case "clo": //clob
              type = database.types.TEXT;
              break;
          case "flo": //float
          case "num": //numeric
              break;
              type = database.types.DOUBLE;
          case "blo": //blob
              type = database.types.BLOB;
        }
        obj.types.push(type);
      }
      return obj;
    };
    
    var get_table_def = function(name, callback) {
      var table = database.source[name];
      if (!table) {
        return callback(0);
      }
      sendMessage({'m':'stat', 'r':{'creating ':name, 'n':database.tables}});
      return callback(table.def);
    };
    
    var get_table_row = function(name, idx, callback) {
        var table = database.source[name];
        if (!table) {
          return callback([], 0);
        }
        
        if (database._training || true) {
          if (idx >= 10) {
            return callback([], 0);
          }
          var row = [];
          for (var i = 0; i < table.types.length; i++) {
            if (table.types[i] == database.types.INT) {
              row.push(idx);
            } else if (table.types[i] == database.types.TEXT) {
              row.push("Example " + idx);
            } else if (table.types[i] == database.types.DOUBLE) {
              row.push(idx + Math.random());
            } else if (table.types[i] == database.types.BLOB) {
              row.push("Binary Example " + idx);
            } else {
              row.push(0);
            }
          }
          return callback(table.types, row, 1 /* will return sync */);
        } else {
          //TODO
          return;
        }
    };
    
    if (database.handle == null) {
        SQL.init(get_table_def, get_table_row);
        database.handle = SQL.open();
    }

    if (database.source == null) {
      database.source = {};
      database.tables = 0;
      database.stream_table("sqlite_master", function(data) {
        if (!data['rows']) {
          database.status = data['status'];
          return;
        }
        for(var i = 0; i < data['rows'].length; i ++) {
          var r = data['rows'][i];
          if (r[0] == "table") {
            database.tables++;
            database.source[r[1]] = build_table_def(r[1], r[4]);
          }
        }
      }, database._finishSetup);
    }
  }
};
