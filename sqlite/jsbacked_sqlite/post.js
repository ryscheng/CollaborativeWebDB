var apiTemp = Runtime.stackAlloc(4);
var fileCounter = 0;

Module['open'] = function(data) {
  var filename = 'file_' + fileCounter++;
  if (data) {
    FS.createDataFile('/', filename, data, true, true);
  }
  var ret = Module['ccall']('sqlite3_open', 'number', ['string', 'number'], [filename, apiTemp]);
  if (ret) throw 'SQLite exception: ' + ret;
  return {
    ptr: getValue(apiTemp, 'i32'),
    filename: filename,

    'close': function() {
      var ret = Module['ccall']('sqlite3_close', 'number', ['number'], [this.ptr]);
      this.ptr = null;
      if (ret) throw 'SQLite exception: ' + ret;
    },
    
    'alloc_cb': function(cb) {
        var idx = FUNCTION_TABLE.length;
        FUNCTION_TABLE[idx] = function(notUsed, argc, argv, colNames) {
          var curr = [];
          for (var i = 0; i < argc; i++) {
            curr.push({
              'column': Pointer_stringify(getValue(colNames + i*Runtime.QUANTUM_SIZE, 'i32')),
              'value': Pointer_stringify(getValue(argv + i*Runtime.QUANTUM_SIZE, 'i32'))
            });
          }
          window.setTimeout( function() {
            FUNCTION_TABLE[idx] = 0;
            var n = FUNCTION_TABLE.length;
            while (n--) {
              if (FUNCTION_TABLE[n] === 0) {
                FUNCTION_TABLE.pop();
              }
            }
            cb(curr);
          }, 0);
          return 0;
        };
        FUNCTION_TABLE.push(0, 0);

        return idx;
    },


    'exec': function(sql, cb) {
      if (!this.ptr) throw 'Database closed!';
      setValue(apiTemp, 0, 'i32');
      var cb_idx = this.alloc_cb(cb);
      var ret = Module['ccall']('sqlite3_exec', 'number', ['number', 'string', 'number', 'number', 'number'],
                                [this.ptr, sql, cb_idx, 0, apiTemp]);
      var errPtr = getValue(apiTemp, 'i32');
      if (ret || errPtr) {
        var msg = 'SQLite exception: ' + ret + (errPtr ? ', ' + Pointer_stringify(errPtr) : '');
        if (errPtr) _sqlite3_free(errPtr);
        throw msg;
      }
      return ret;
    },

    'exportData': function() {
      if (!this.ptr) throw 'Database closed!';
      return new Uint8Array(FS.root.contents[this.filename].contents);
    }
  };
};

this['SQL'] = Module;