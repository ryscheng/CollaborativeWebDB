Module['init'] = function(init_callback, retrieve_callback) {
    function init_springboard(stmt) {
        var ptr = Module['allocate'](stmt, 'i8', Module['ALLOC_NORMAL']);
        Module['ccall']('jsbacked_done','number', ['number'], [ptr]);
    };

    function get_springboard(types, arr) {
        if (arr === 0) { // end of table.
          Module['ccall']('jsbacked_done','number', ['number'], [0]);
          return;
        }
        
        var cols = arr.length;
        // Allocate the pointer array.
        var ptr = Module['allocate'](cols + 1, 'i32', Module['ALLOC_NORMAL']);
        // Insert the entries.
        for (var i = 0; i < cols; i++) {
            var type = types[i];
            var value = 0;
            var length = 0;
            if (type == 0 || type == 2 ||  type == 5) { //blob, error, text
              length = arr[i].length;
              value = Module['allocate'](arr[i],'i8', Module['ALLOC_NORMAL']);
            } else if (type == 1) { // double
              length = 8;
              value = Module['allocate'](1, 'double', Module['ALLOC_NORMAL']);            
              Module['setValue'](value, arr[i], 'double');
            } else if (type == 3 || type == 6) { //int, zeroblob
              length = 4;
              value = Module['allocate'](1,'i32', Module['ALLOC_NORMAL']);
              Module['setValue'](value, arr[i], 'i32');
            } else if (type == 4) { //int64
              length = 8;
              value = Module['allocate'](1,'i64', Module['ALLOC_NORMAL']);
              Module['setValue'](value, arr[i], 'i64');
            }
            var struct = Module['allocate']([type, length, value], ['i32','i32','i32'], Module['ALLOC_NORMAL']);
            Module['setValue'](ptr + i, struct, 'i32');
        }

        Module['ccall']('jsbacked_done','number', ['number'], [ptr]);
    };

    var launchpad = FUNCTION_TABLE.length;
    FUNCTION_TABLE[launchpad] = function(table, index) {
        var name = Pointer_stringify(table);
        if (index < 0) {
            // Get a table's create statement.
            init_callback(name, init_springboard);
        } else {
            // Get a table row.
            retrieve_callback(name, index, get_springboard);
        }
    };
    FUNCTION_TABLE.push(0, 0);
    var ret = Module['ccall']('jsbacked_init', 'number', ['number'], [launchpad]);
    return ret;
};