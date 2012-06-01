var database = {
  page_width: 30,
  source: null,
  data: {},
  handle: null,
  _training: false,
  _blocked: [],
  
  execute: function(query, callback, only_train, page) {
    if (database._blocked !== false) {
      database._blocked.push(function() {
        database.execute(query, callback, only_train, page);
      });
      if (database.source == null)
        return database.init();
      return "Currently Initializing";
    }

    if (!query.length) {
      return callback(null, "No Query");
    }

    if (query.match(/^SELECT/i)) {
      // paging
      
      if (query.indexOf(";") == -1) {
        query = query + ";";
      }
      var query_base_offset = database._getPageOffset(query);
      var query_page_offset = query_base_offset;
      if (page && !isNaN(page)) {
        query_page_offset += (page-1) * database.page_width;
      }
      var query_base = database._rebaseQueryRowid(query, 0);
      var query_real = database._rebaseQueryRowid(query, query_page_offset);
      Host.log("cost query is " + query_base);
      Host.log("real query is " + query_real);
      database._reset();
      database._training = true;
      try {
        return database.handle.exec(query_base, database._cost.bind(this, query_real, callback, only_train, query_page_offset));
      } catch(e) {
        database._reset();
        callback(null, e.stack);
        return 1;
      }
    } else {
      try {
        return database.handle.exec(query, callback);
      } catch(e) {
        database._reset();
        callback(null, e);
        return 1;
      }
    }
  },
  _getPageOffset: function(query) {
      var qLimit = query.match(/LIMIT\s*(\d+),?\s*(\d+)?/i);
      var qRowid = query.match(
          /rowid\s*([=><])\s*(\d+)(\s+AND\s+rowid\s*([=><])\s*(\d+))?/i);

      // find offset into results from which we will return
      var offset = 0;
      if (qRowid) {
        if      (qRowid[1] == '>') { offset = parseInt(qRowid[2])+1; }
        else if (qRowid[1] == '=') { offset = parseInt(qRowid[2]);   } 
        else if (qRowid[4] == '>') { offset = parseInt(qRowid[5])+1; }
        else if (qRowid[4] == '=') { offset = parseInt(qRowid[5]);   }
      }
      else if (qLimit && qLimit[2]) {
        offset = parseInt(qLimit[1]);
      }
      else {

      }
      return offset;
  },

  _rebaseQueryLimit: function(query, offset) {
      var qLimit = query.match(/LIMIT\s*(\d+),?\s*(\d+)?/i);

      var limit = ' LIMIT ' + offset + ', ' + database.page_width + ';';
      
      if (qLimit === null) { // no limit at end of query
        query = query.replace(/;/, limit);
      }
      else {
        query = query.replace(/ LIMIT[^a-zA-Z]*;/i, limit);
      }
      return query;
  },
  _rebaseQueryRowid: function(query, offset) {
    var qWhere = query.match(/WHERE/i);
    if (qWhere && query.match(/rowid/)) {
      return query;
    }
    else if (qWhere) {
      return this._rebaseQueryLimit(query, offset);
    }
    else {  //assume query pretty simple...
      var whereClause = " WHERE rowid > "+(offset-1)+" AND rowid < "+(offset+30)+";"; 
      query = query.replace(/;/, whereClause); 
    }
    return query;
  },

  _cost: function(query, callback, only_train, query_offset, answer) {
    if (only_train) {
        database._reset();
        return callback(answer);
    }

    var table_cost = 0;
    for (var i in database.source) {
      var t = database.source[i];
      var indicies = 0;
      for (var d in t.dirty) {
        indicies++;
      }
      if (indicies > 0 && indicies <= database.page_width) {
        table_cost += 1;
      } else if (indicies > 0) {
        table_cost += 5;
      }
    }
    Host.log("Query estimated to cost " + table_cost + " pages");
    
    if (table_cost <= 4) { // Store base tables
      var n = 1;
      var continuation = function() {
        if (--n == 0) {
          database._reset();
          database.handle.exec(query, callback);
        }
      };

      for (var i in database.source) {
        var t = database.source[i];
        var indicies = 0;
        for (var d in t.dirty) {
          indicies++;
        }

        if (indicies > 0) {
          var remainder = query_offset % database.page_width;
          var first_offset = query_offset - remainder;
          n++;
          database.load_page(database.get_table_page_key(i, first_offset), continuation);
          if (remainder) {
            n++;
            database.load_page(database.get_table_page_key(i, first_offset + database.page_width), continuation);
          }
        }
      }
      continuation();
    } else { // Directly load results (from the server)
      var key = database.get_complex_page_key(query);
      database.load_page(key, function() {
        var result = database._get(key);
        var cols = result['cols'];
        var rows = result['rows'];

        var copy = [];
        for (var i = 0; i < rows.length; i++) {
          copy.push(rows[i].slice());
        }
        for (var r = 0; r < copy.length; r++) {
          for (var c = 0; c < copy[r].length; c++) {
            copy[r][c] = {'column':cols[c], 'value':copy[r][c]};
          }
        }
        callback(copy, null);
      });
    }
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

  get_table_page_key: function(table, offset) {
    var q = "SELECT * FROM " + table + " limit " + offset + ",30;";
    return {"query": q,
            "table": table,
            "hash": table + "." + offset};
  },
  
  get_complex_page_key: function(query) {
    return {"query": query,
            "hash": CryptoJS.MD5(query.trim()).toString()};
  },
  
  _get: function(key) {
    return database.data[key.hash] || null;
  },
  
  _set: function(key, page) {
    database.data[key.hash] = page;
    
    if (key.hash.indexOf(".") > 0) {
      var to = key.hash.split(".");
      var table = database.source[to[0]];
      if (table && page && table.topPage < to[1] && page['rows'].length) {
        table.topPage = to[1];
      }
    }

    // generate a callback to access the data
    pageAccessFn = this._get.bind(this, key);

    // tell the server that we have that hash
    Host.announce_hash(key, pageAccessFn);
  },

  load_page: function(key, callback) {
    if (database._get(key)) {
        return callback();
    }

    Host.get_hash(key.hash, function(page) {
        if (!page) {
            database.load_from_server(key, function(p) {
                database._set(key, p);
                callback();
            });
        } else {
            database._set(key, page);
            callback();
        }
    });
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
    database.ajax.asynchronous("/data?q=" + encodeURIComponent(key['query']), function(r) {
      if (r.readyState == 4) {
        var actual_data = JSON.parse(r.responseText);
        callback(actual_data);
      }
    });
  },
  
  stream_table: function(table, callback, and_then, offset) {
    if (!offset)
      offset = 0;
    var key = database.get_table_page_key(table, offset);
    database.load_page(key, function() {
      var more = true;
      var data = database._get(key);
      if (data['rows'] && data['rows'].length == database.page_width) {
        database.stream_table(table, callback, and_then, offset + database.page_width);
      } else {
        more = false;
      }
      callback(data);
      if (!more && and_then) {
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
        dirty: {},
        topPage: 0
      };
      // When this breaks, http://regexpal.com is useful for seeing what isn't matching.
      var create_regexp = /^\s*create\s+(temp|temporary)?\s*table\s+(\w*\.)?(\w*)\s+\(((\s*(\w+)\s+(\S+)(\s+(PRIMARY|NOT|UNIQUE|CHECK|DEFAULT|COLLATE|REFERENCES)[^,\)]*)?)(,\s*(\w+)\s+(\S+)(\s+(PRIMARY|NOT|UNIQUE|CHECK|DEFAULT|COLLATE|REFERENCES)[^,\)]*)?)*?)(,\s+(PRIMARY|UNIQUE|CHECK|FOREIGN)([^,]|\(.*\))+)*\)\s*$/i;
      var matches = create_regexp.exec(create);
      if (!matches) {
        Host.log("Unparsed table definition: " + create);
        return null;
      }
      // column defs show up matches[4]
      var columns = matches[4].split(",");
      for (var i = 0; i < columns.length; i++) {
        var kv = columns[i].trim().match(/^([\S]*)\s+([\S]*)/i);
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
        
        if (database._training) {
          table.dirty[idx] = true;
          if (idx >= 2*database.page_width) {
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
          var remainder = idx % database.page_width;
          var page_offset = idx - remainder;
          var page = database._get(database.get_table_page_key(table.name, page_offset));
          var row = page && page['rows'][remainder];
          if (!row && table.topPage > page_offset) {
            var topPage = database._get(database.get_table_page_key(table.name, table.topPage));
            return callback(table.types, topPage['rows'][0], 1);
          } else if (!row) {
            return callback(table.types, 0, 1);
          } else {
            return callback(table.types, row, 1);
          }
        }
    };

    Host.prop('page_width', database.page_width);
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
