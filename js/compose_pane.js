var compose_pane = {
  init: function() {
    database.load_from_server("sqlite_master",0,compose_pane.render_sqlite);
  },
  render_sqlite: function(data) {
    $('#compose').empty();

    if (data['rows']) {
      for (var i = 0; i < data['rows'].length; i++) {
        var r = data['rows'][i];
        if(r[0] == "table") {
          var block = document.createElement("div");
          $('#compose').addClass('three-column span10 offset1').append($(block)
            .append(compose_pane.render_sqlite_table(r[1],r[4])));
        }
      }
    } else {
      var result = document.createElement('div');
      $(result).addClass("alert")
          .html("<strong>Warning!</strong> " +
              (data['status'] || "Failed to connect to server!"));
      $('#compose').append(result);
    }
  },
  render_sqlite_table: function(name, create) {
    var body = document.createElement('tbody');
    var rows = create.split('\n');
    for (var i = 1; i < rows.length; i++) {
        if (rows[i].trim().match(/(PRIMARY KEY|UNIQUE|FOREIGN KEY)/))
            continue
        var kv = rows[i].trim().match(/([\S]*)\s+([\S]*)/i);
        if (kv == null || kv.length < 3)
            continue;
        var row = document.createElement('tr');
        $(row).html('<td>'+kv[1]+'</td><td>'+kv[2]+'</td>');
        body.appendChild(row);
    }
    var properties = create.match(/CREATE TABLE [\S]+ \((.*)\)/);
    var tbl = document.createElement('table');
    $(tbl).addClass('table table-striped table-bordered span3')
        .html('<thead><tr><th colspan=2>' + name + '</th></tr>' +
          '<tr><th>Name</th><th>Type</th></tr></thead>')
        .append(body);
    return tbl;
  }
};
