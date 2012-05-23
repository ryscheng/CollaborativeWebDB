Module['init'] = function(init_callback, retrieve_callback) {
    function init_springboard(stmt) {
        var ptr = allocate(intArrayFromString(stmt), 'i8', 0 /* alloc_normal */);
        Module['ccall']('jsbacked_done','number', ['number','number'], [ptr,0]);
    };

    function get_springboard(types, arr, will_return_sync) {
        if (arr === 0) { // end of table.
          Module['ccall']('jsbacked_done','number', ['number','number'], [0,0]);
          return;
        }
        
        var cols = arr.length;
        // Allocate the pointer array.
        var ptr = Module['allocate'](4*(cols + 1), 'i32', 0 /* alloc_normal */);
        // Insert the entries.
        for (var i = 0; i < cols; i++) {
            var type = types[i];
            var value = 0;
            var length = 0;
            if (type == 0 || type == 2 ||  type == 5) { //blob, error, text
              length = arr[i].length;
              value = Module['allocate'](intArrayFromString(arr[i]),'i8', 0 /* alloc_normal */);
            } else if (type == 1) { // double
              length = 8;
              value = Module['allocate'](1, 'double', 0 /* alloc_normal */);            
              Module['setValue'](value, arr[i], 'double');
            } else if (type == 3 || type == 6) { //int, zeroblob
              length = 4;
              value = Module['allocate'](1,'i32', 0 /* alloc_normal */);
              Module['setValue'](value, arr[i], 'i32');
            } else if (type == 4) { //int64
              length = 8;
              value = Module['allocate'](1,'i64', 0 /* alloc_normal */);
              Module['setValue'](value, arr[i], 'i64');
            }
            var struct = Module['allocate'](12, 'i32', 0 /* alloc_normal */);
            setValue(struct,type,'i32');
            setValue(struct+4,length,'i32');
            setValue(struct+8,value,'i32');
            Module['setValue'](ptr + 4*i, struct, 'i32');
        }
        Module['setValue'](ptr + 4*cols, 0, 'i32');

        Module['ccall']('jsbacked_done','number', ['number','number'], [ptr, will_return_sync || 0]);
        return 0;
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