var database = {
  page_width: 30,
  source: null,
  _training: false,
  _blocked: [],
  
  execute: function(query, callback, only_train) {
    if (database._blocked !== false) {
      database._blocked.push(function() {
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
      database._training = true;
      log.write("training query");
      try {
        q = new jsinq.Query(query);
      } catch(e) {
        log.warn("error constructing query");
        database._reset();
        callback(null, e);
        return;
      }
      try {
        var enumerable = q.getQueryFunction()(database.source);
        if (only_train) {
          callback(enumerable, null);
        } else {
          database._cost(query, callback, enumerable);
        }
      } catch(e) {
        log.warn("error generating enumerator");
        database._reset();
        callback(null, e);
      }
    }, 0);
  },
  get_schema: function(query, callback) {
    database._training = true;
    database.execute(query, function(enumerable, error) {
    if (error)
      console.log(error.stack);
      if (!enumerable) {
        database._reset();
        return callback([], error);
      }
      enumerable.first(function(item) {
        var idxs = [];
        for (var i in item) {
          idxs.push(i);
        }
        database._reset();
        callback(idxs);
        return true;
      });
    }, true);
  },
  
  _cost: function(query, callback, enumerable) {
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
  },
  
  _unblock: function() {
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

  EnumerableSource: function(name) {
    this.name = name;
    this.cols = {};
    this.colnames = [];
    this.rows = -1;
    this.pages = {};
    this.dirty = {};
    
    this.store = function(page) {
      var key = database.get_page_key(this.name, page['range'][0]);
      console.log('stored ' + key.hash);
      this.pages[key.hash] = page;
    };

    this.getNumRows = function() {
      if (database._training) {
        this.rows = 10;
      } else {
        var key = database.get_page_key(this.name, 0);
        if (this.pages[key.hash] && this.pages[key.hash]['total']) {
            this.rows = this.pages[key.hash]['total']
        } else {
          log.warn("Unrealized table " + this.name + " queried.");
          throw new Error("Access to uninitialized table");
        }
      }
      return this.rows;
    };
    
    this.getRow = function(index) {
        var data = [];
        if (database._training) {
          this.dirty[index] = 1;
          for (var i = 0; i < this.colnames.length; i++) {
            var type = this.cols[this.colnames[i]].toLowerCase();
            var val = index;
            if (type.indexOf("char") > -1) val = String.fromCharCode(97 + index);
            else if (type.indexOf("date") > -1) val = Date.now() - index;
            else if (type.indexOf("float") > -1 ) val = index + Math.random();
            data.push(val);
          }
        } else {
          var page_offset = index % database.page_width;
          var key = database.get_page_key(this.name, index - page_offset);
          var page = this.pages[key.hash];
          if (!page) {
            log.warn("Unrealized access to page " + key.hash);
            throw new Error("Access to nonexistent data page");
          }
          data = page['rows'][page_offset];
        }
        var row = {};
        for (var i = 0; i < this.colnames.length; i++) {
            row[this.colnames[i]] = data[i];
        }
        return row;
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
      var obj = new database.EnumerableSource(name);
      var rows = create.split('\n');
      for (var i = 1; i < rows.length; i++) {
        if (rows[i].trim().match(/(PRIMARY KEY|UNIQUE|FOREIGN KEY)/))
            continue
        var kv = rows[i].trim().match(/([\S]*)\s+([\S]*)/i);
        if (kv == null || kv.length < 3)
            continue;
        obj.colnames.push(kv[1]);
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
      }, database._unblock);
    }
  }
};
