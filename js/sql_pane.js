var sql_pane = function(query) {
  this.query = query;
  this.id = sql_pane.counter++;
  if (query.trim().toLowerCase().indexOf("select") != 0) {
    this.beginSQL();
  } else {
    this.beginSelect();
  }

  return this;
}

sql_pane.panes = [];
sql_pane.counter = 1;
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

sql_pane.prototype.beginSelect = function() {
  this.createResultUI();
  database.exec(this.query, false, this.renderData.bind(this), function() {
    $('#result_' + this.id + ' bar').css('width','50%');
  });
};

sql_pane.prototype.beginSQL = function() {
  this.createResultUI();
  database.execute(this.query, this.renderCompletion.bind(this));
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
      .html("<div class='offset4 span4 progress progress-striped active'>" +
      "<div class='bar' style='width: 25%;'></div></div>");
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
    this.table.appendChild(this.thead);
    this.table.appendChild(this.tbody);
  }
};

sql_pane.prototype.renderHead = function(data, error) {
  this.thead = document.createElement('tr');
  if (data && data.length) {
    for (var i = 0; i < data.length; i++) {
      var cell = document.createElement('th');
      cell.innerHTML = data[i].column;
      this.thead.appendChild(cell);
    }
  } else {
    var cell = document.createElement('th');
    cell.innerHTML = error ? "Error" : "Unknown";
    this.thead.appendChild(cell);
  }
};

sql_pane.prototype.renderData = function(data, error) {
  if (!this.thead) {
    this.renderHead(data,error);
  }
  if (!this.tbody) {
    this.tbody = document.createElement('tbody');
  }
  if (data) {
    var row = document.createElement('tr');
    for (var r = 0; r < data.length; r++) {
      var cell = document.createElement('td');
      cell.innerHTML = data[r].value;
      row.appendChild(cell);
    }
    this.tbody.appendChild(row);
  } else {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.innerHTML = error || "No data returned.";
    row.appendChild(cell);
    this.tbody.appendChild(row);
  }
  this.updateTable_();
};

sql_pane.prototype.renderCompletion = function(data, error) {
  if (data) {
    this.element.innerHTML = "<pre>" + data + "</pre>";
  } else {
    this.element.innerHTML = "<pre>" + (error || "Done.") + "</pre>";
  }
};