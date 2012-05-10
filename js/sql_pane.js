var sql_pane = function(query) {
  return this.newInstance(query);
}
sql_pane.panes = [];
sql_pane.init = function() {
  $("#queryform").submit(function(e) {
    e.preventDefault();
    return false;
  });
  $("#executor").click(function(e) {
    sql_pane.panes.push(new sql_pane($("#querybox").val()));
    return false;
  });
};
sql_pane.progressBar_ = function(type, percent) {
  return "<div class='" + type + " progress progress-striped active'>" +
      "<div class='bar' style='width: " + percent + "%;'></div></div>";
};


sql_pane.counter = 1;
sql_pane.prototype.newInstance = function(query) {
  var instance = {
    query: query,
    id:sql_pane.counter++
  };
  instance.updateTable_ = this.updateTable_;

  this.createResultUI.bind(instance).call();
  database.get_schema(query, this.renderHead.bind(instance));
  database.execute(query, this.renderData.bind(instance));
  return instance;
};

sql_pane.prototype.createResultUI = function() {
  var title = document.createElement("a");
  $(title).attr('href','#result_' + this.id).attr('data-toggle','tab')
      .html("Result ");
  var tab = document.createElement("li");
  $(tab).append(title);
  $("#results>ul").append(tab);

  this.element = document.createElement("div");
  $(this.element).addClass("tab-pane").attr('id','result_' + this.id)
      .html(sql_pane.progressBar_("offset4 span4", 25));
  $("#results>.tab-content").append(this.element);

  var that = this;
  var closer = document.createElement("i");
  $(closer).addClass('icon-remove-sign tab-close').click(function() {
    if ($(tab).hasClass('active')) {
      $("#results a:first").tab('show');
    }
    $(tab).detach();
    $(that.element).detach();
  });

  $(title).append(closer).tab('show');
};

sql_pane.prototype.updateTable_ = function() {
  if (!this.table) {
    var q = document.createElement('p');
    q.innerHTML = '<span class="label label-info">Query</span><pre>' +
        this.query + '</pre>';

    this.table = document.createElement('table');
    $(this.table).addClass('table table-bordered table-striped');
    this.element.innerHTML = '';
    this.element.appendChild(q);
    this.element.appendChild(this.table);
  }
  if (this.thead && !$(this.table).has(this.tbody).size()) {
    $(this.table).find('.temphead').detach();
    this.table.appendChild(this.thead);
  } else if (!this.thead) {
    var tempHead = document.createElement('thead');
    tempHead.className = 'temphead';
    tempHead.innerHTML = '<tr><th colspan=100>' + sql_pane.progressBar_("", 100) + '</th></tr>';
    this.table.appendChild(tempHead);
  }
  if (this.tbody && !$(this.table).has(this.tbody).size()) {
    $(this.table).find('.tempbody').detach();
    this.table.appendChild(this.tbody);
  } else if (!this.tbody) {
    var tempBody = document.createElement('tbody');
    tempBody.innerHTML = '<tr><td colspan=100>' + sql_pane.progressBar_("", 100) + '</td></tr>';
    tempBody.className = 'tempbody';
    this.table.appendChild(tempBody);
  }
};

sql_pane.prototype.renderHead = function(data) {
  this.thead = document.createElement('tr');
  for (var i = 0; i < data.length; i++) {
    var cell = document.createElement('th');
    cell.innerHTML = data[i];
    this.thead.appendChild(cell);
  }
  this.updateTable_();
};

sql_pane.prototype.renderData = function(data) {
  this.tbody = document.createElement('tbody');
  for (var i = 0; i < data.length; i++) {
    var row = document.createElement('tr');
    for (var j = 0; j < data[i].length; j++) {
      var cell = document.createElement('td');
      cell.innerHTML = data[i][j];
      row.appendChild(cell);
    }
    this.tbody.appendChild(row);
  }
  this.updateTable_();
};