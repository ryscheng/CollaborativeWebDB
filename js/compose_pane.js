var compose_pane = {
  init: function() {
    // Note: we do this kind-of weird initialization the first time.
    // initialization ends up with a different code path, and the status callbacks
    // are more interesting than the data / completion ones.
    database.status_cb = compose_pane.update_status;
    database.exec("SELECT * FROM SQLITE_MASTER;", true, compose_pane.finish_init, function() {});
    $('#compose .bar').css('width', "10%");
  },
  finish_init: function() {
    log.write("Database loaded, reading tables.");
    database.status_cb = null;
    database.backing(compose_pane.render_sqlite);
  },
  render_sqlite: function(s) {
    $('#compose').empty();

    var tables = 0;
    if (s) {
      for (var i in s) {
        tables++;
        var block = document.createElement("div");
        $('#compose').addClass('three-column span10 offset1').append($(block)
           .append(compose_pane.render_table(s[i])));
      }
    }
    if (tables == 0 || !s) {
      var result = document.createElement('div');
      var msg = !s? "Initialization failed!  Check the log for details." : "No data loaded";
      $(result).addClass("alert")
          .html("<strong>Warning!</strong> " + (database.error || msg));
      $('#compose').append(result);
    }
  },
  _seen: 0,
  update_status: function(msg) {
    if($('#compose .bar').size() > 0 && msg && msg['n']) {
      var ci = ++compose_pane._seen;
      var percent = 100 * ci / msg['n'];
      $('#compose .bar').css('width', percent + "%");
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
