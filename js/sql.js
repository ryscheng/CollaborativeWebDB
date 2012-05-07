var database = {
  execute: function(query, callback) {
    //TODO: execute the query, and run callback with the resulting tuples.
    callback([["john smith",24], ["adam lerner",115]]);
  },
  get_schema: function(query, callback) {
    //TODO: return the columns of the query.
    callback(["name", "awesomeness"]);
  }
};
