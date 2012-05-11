var database = {
  source: null,
  blocked: [],
  
  execute: function(query, callback) {
    if (database.blocked !== false) {
      database.blocked.push(function() {
        database.execute(query, callback);
      });
      if (database.source == null)
        database.init();
      return;
    }

    window.setTimeout(function() {
      var q;
      if (!query.length) {
        return callback(null, "No Query");
      }
      log.write("evaluating " + query.trim());
      try {
        q = new jsinq.Query(query);
      } catch(e) {
        log.warn("error constructing query");
        callback(null, e);
        return;
      }
      try {
        callback(q.getQueryFunction()(database.source));
      } catch(e) {
        log.warn("error generating enumerator");
        callback(null, e);
      }
    }, 0);
  },
  get_schema: function(query, callback) {
    database.execute(query, function(enumerable, error) {
    if (error)
      console.log(error.stack);
      if (!enumerable) {
        return callback([], error);
      }
      enumerable.first(function(item) {
        var idxs = [];
        for (var i in item) {
          idxs.push(i);
        }
        callback(idxs);
        return true;
      });
    });
  },
  
  unblock: function() {
    var waiters = database.blocked;
    database.blocked = false;
    for (var i = 0; i < waiters.length; i++) {
      waiters[i]();
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

    server.lookup(key.hash, function(peers) {
        if (!peers.length) {
            database.load_from_server(key, callback);
        } else {
            console.log('would get from peers');
        }
    });
  },

  load_from_server: function(key, callback) {
    $.ajax({
      url: "/data",
      data: { t: key['table'], o: key['offset'] }
    }).done(callback);
  },
  
  stream_table: function(table, callback, and_then, offset) {
    if (!offset)
      offset = 0;
    database.load_page(database.get_page_key(table, offset), function(data) {
      if (data['rows'] && data['range'][1] < data['total']) {
        database.stream_table(table, callback, and_then, data['range'][1]);
      }
      callback(data);
      if (data['range'][1] >= data['total'] && and_then) {
        and_then();
      }
    });
  },

  EnumerableSource: function(name, cols) {
    this.name = name;
    this.cols = cols;
    this.rows = -1;
    this.pages = {};

    this.getNumRows = function() {
      if(this.rows < 0) {
        this.rows = 100;
      }
      return this.rows;
    };
    
    this.getRow = function(index) {
        return {i:index, n:1};
    };

    var that = this;
    this.getEnumerator = function() {
      return new function() {
        var index = -1;
        this.moveNext = function() {
          ++index;
          return index < that.getNumRows();
        };

        this.current = function() {
          if (index < 0 || index > that.getNumRows()) {
            throw new InvalidOperationException();
          }
          return that.getRow(index);
        };
        this.reset = function() {
          index = -1;
        };
      };
    };
  },
  
  init: function() {
    database.EnumerableSource.prototype = jsinq.Enumerable.prototype;
    var build_table_def = function(name, create) {
      var obj = new database.EnumerableSource(name, {});
      var rows = create.split('\n');
      for (var i = 1; i < rows.length; i++) {
        if (rows[i].trim().match(/(PRIMARY KEY|UNIQUE|FOREIGN KEY)/))
            continue
        var kv = rows[i].trim().match(/([\S]*)\s+([\S]*)/i);
        if (kv == null || kv.length < 3)
            continue;
        obj.cols[kv[1]] = kv[2];
      }

      return obj;
    };

    if (database.source == null) {
      database.source = {};
      database.stream_table("sqlite_master", function(data) {
        if (!data['rows']) {
          database.status = data['status'];
          return;
        }
        for(var i = 0; i < data['rows'].length; i ++) {
          var r = data['rows'][i];
          if (r[0] == "table") {
            database.source[r[1]] = build_table_def(r[1], r[4]);
          }
        }
      }, database.unblock);
    }
  }
};
