var compose_pane = {
  init: function() {
    // Note: we do this kind-of weird initialization the first time.
    // initialization ends up with a different code path, and the status callbacks
    // are more interesting than the data / completion ones.
    database.status_cb = compose_pane.update_status;
    database.exec("SELECT * FROM SQLITE_MASTER;", true, function() {}, function() {});
  },
  finish_init: function() {
    console.log("finishing init");
    database.backing(function(x) {console.log(x);});
  },
  render_sqlite: function() {
    //$('#compose').empty();
/*
    var tables = 0;
    if (database.source) {
      for (var i in database.source) {
        tables++;
        var block = document.createElement("div");
        $('#compose').addClass('three-column span10 offset1').append($(block)
           .append(compose_pane.render_table(database.source[i])));
      }
    }
    if (tables == 0 || !database.source) {
      var result = document.createElement('div');
      $(result).addClass("alert")
          .html("<strong>Warning!</strong> " +
              (database.status || "Failed to connect to server!"));
      $('#compose').append(result);
    }
*/
  },
  _seen: 0,
  update_status: function(msg) {
    if($('#compose .bar').size() > 0 && msg && msg['n']) {
      var ci = ++compose_pane._seen;
      var percent = 100 * ci / msg['n'];
      $('#compose .bar').css('width', percent + "%");
    } else if (msg == "Database Initialized") {
      window.setTimeout(compose_pane.finish_init, 1000);
    }
  },
  render_table: function(table) {
    var body = document.createElement('tbody');
    for (var i in table.cols) {
      var row = document.createElement('tr');
      $(row).html('<td>'+i+'</td><td>'+table.cols[i]+'</td>');
      body.appendChild(row);
    }
    var tbl = document.createElement('table');
    $(tbl).addClass('table table-striped table-bordered span3')
        .html('<thead><tr><th colspan=2>' + table['name'] + '</th></tr>' +
          '<tr><th>Name</th><th>Type</th></tr></thead>')
        .append(body);
    return tbl;
  }
};
