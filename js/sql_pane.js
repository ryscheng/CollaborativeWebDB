var sql_pane = function(query) {
  this.query = query;
  this.id = sql_pane.counter++;
  this.page = 1;
  this.beginSelect();

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
  //console.debug(this.query, this.page);
  database.exec(this.query, false, this.renderData.bind(this), 
                this.renderCompletion.bind(this), this.page);
};

sql_pane.prototype.createResultUI = function() {
  var title = document.createElement("a");
  $(title).attr('href','#result_' + this.id).attr('data-toggle','tab')
      .html("Result ");
  var tab = document.createElement("li");
  $(tab).append(title);
  $("#results>ul").append(tab);

  this.element = document.createElement("div");
  $(this.element).addClass("tab-pane").attr('id','result_' + this.id);
  this.loadingMode(); 
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

sql_pane.prototype.loadingMode = function() {
  delete this.tbody;
  delete this.thead;
  if (this.table) {
    $('#result_' + this.id + ' a').unbind();
    delete this.table;
  }
  $(this.element).html("<div class='offset4 span4 progress progress-striped active'>" +
      "<div class='bar' style='width: 25%;'></div></div>");
}
sql_pane.prototype.updateTable_ = function() {
  if (!this.table) {
    var q = document.createElement('p');
    q.innerHTML = '<span class="label label-info">Query</span><pre>' +
        this.query + '</pre>';

    this.table = document.createElement('table');
    $(this.table).addClass('table table-bordered table-striped');

    // pager
    var pager = document.createElement('ul');
    $(pager).addClass('pager');
    var nextid = 'result_'+this.id+'_next';
    var previd = 'result_'+this.id+'_prev';
    pager.innerHTML = '<li class="previous"><a href="#" id="'+previd+'">Previous</a></li>'+
        '<li class="next"><a href="#" id="'+nextid+'">Next</a></li>';

    this.element.innerHTML = '';
    this.element.appendChild(q);
    this.element.appendChild(this.table);
    this.element.appendChild(pager);
    this.thead && this.table.appendChild(this.thead);
    this.table.appendChild(this.tbody);

    var that = this;
    if (this.page == 1) {$('#result_'+this.id+' li.previous').addClass('disabled');}
    $('#'+previd).click(function(e) {
      e.preventDefault();
      if (that.page > 1) that.page--;
      else return false;
      if (that.page == 1) { $('#result_'+this.id+' li.previous').addClass('disabled'); } 
      $('#result_'+this.id+' li.next').removeClass('disabled');
      that.loadingMode();
      database.exec(that.query, false, that.renderData.bind(that), that.renderCompletion.bind(that), that.page);
      return false;
    });
    $('#'+nextid).click(function(e) {
      e.preventDefault();
      that.page++;
      $('#result_'+this.id+' li.previous').removeClass('disabled');
      that.loadingMode();
      database.exec(that.query, false, that.renderData.bind(that), that.renderCompletion.bind(that), that.page);
      return false;
    });
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
  if (!this.thead && data && data.length) {
    this.renderHead(data[0], error);
  }
  if (!this.tbody) {
    this.tbody = document.createElement('tbody');
  }
  if (data && data.length) {
    for(var r = 0; r < data.length; r++) {
      var row = document.createElement('tr');
      for (var c = 0; c < data[r].length; c++) {
        var cell = document.createElement('td');
        cell.innerHTML = data[r][c].value;
        row.appendChild(cell);
      }
      this.tbody.appendChild(row);
    }
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
  if (!this.thead) {
    if (data) {
      if (data == 1) data = "SQLITE_ERROR";
      else if (data == 2) data = "SQLITE_INTERNAL";
      else if (data == 3) data = "SQLITE_PERM";
      else if (data == 4) data = "SQLITE_ABORT";
      else if (data == 7) data = "SQLITE_NOMEM";

      this.element.innerHTML = "<pre>" + data + "</pre>";
    } else if (error) {
      this.element.innerHTML = "<pre>" + error + "</pre>";
    } else if (this.page == 1) {
      this.element.innerHTML = "<pre>Done.</pre>";
    }
  } else {
    if (this.tbody.childNodes.length < database.page_width) {
      $('#result_'+this.id+' li.next').addClass('disabled');
    }
  }
};
