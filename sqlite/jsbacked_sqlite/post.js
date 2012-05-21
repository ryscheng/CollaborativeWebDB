var apiTemp = Runtime.stackAlloc(4);
var fileCounter = 0;

var execCounter = 0;
Module['execs'] = [];

Module['open'] = function(data) {
  var filename = 'file_' + fileCounter++;
  if (data) {
    FS.createDataFile('/', filename, data, true, true);
  }

  var ret = Module['ccall']('sqlite3_open', 'number', ['string', 'number'], [filename, apiTemp]);
  if (ret) throw 'SQLite exception: ' + ret;

  var cb_ptr = FUNCTION_TABLE.length;
  FUNCTION_TABLE[cb_ptr] = function(ptr, argc, argv, colNames) {
    var curr = [];
    for (var i = 0; i < argc; i++) {
      curr.push({
        'column': Pointer_stringify(getValue(colNames + i*Runtime.QUANTUM_SIZE, 'i32')),
        'value': Pointer_stringify(getValue(argv + i*Runtime.QUANTUM_SIZE, 'i32'))
      });
    }
    Module['execs'][ptr].push(curr);
  };

  return {
    ptr: getValue(apiTemp, 'i32'),
    filename: filename,
    callbacks: [],

    'close': function() {
      var ret = Module['ccall']('sqlite3_close', 'number', ['number'], [this.ptr]);
      this.ptr = null;
      if (ret) throw 'SQLite exception: ' + ret;
    },

    'exec': function(sql, cb) {
      if (!this.ptr) throw 'Database closed!';
      setValue(apiTemp, 0, 'i32');
      var cb_idx = execCounter++;
      Module['execs'][cb_idx] = [];
      var ret = Module['ccall']('sqlite3_exec', 'number', ['number', 'string', 'number', 'number', 'number'],
                                [this.ptr, sql, cb_ptr, cb_idx, apiTemp]);
      var errPtr = getValue(apiTemp, 'i32');
      if (ret || errPtr) {
        var msg = 'SQLite exception: ' + ret + (errPtr ? ', ' + Pointer_stringify(errPtr) : '');
        if (errPtr) _sqlite3_free(errPtr);
        cb(null,msg);
      } else {
        cb(Module['execs'][cb_idx], null);
      }
      delete Module['execs'][cb_idx];
      return ret;
    },

    'exportData': function() {
      if (!this.ptr) throw 'Database closed!';
      return new Uint8Array(FS.root.contents[this.filename].contents);
    }
  };
};

this['SQL'] = Module;