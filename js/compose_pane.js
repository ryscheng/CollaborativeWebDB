var compose_pane = {
  init: function() {
    database.execute("", compose_pane.render_sqlite);
    //database.load_from_server("sqlite_master",0,compose_pane.render_sqlite);
  },
  render_sqlite: function() {
    $('#compose').empty();

    if (database.source) {
      for (var i in database.source) {
        var block = document.createElement("div");
        $('#compose').addClass('three-column span10 offset1').append($(block)
           .append(compose_pane.render_table(database.source[i])));
      }
    } else {
      var result = document.createElement('div');
      $(result).addClass("alert")
          .html("<strong>Warning!</strong> " +
              (database.status || "Failed to connect to server!"));
      $('#compose').append(result);
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
