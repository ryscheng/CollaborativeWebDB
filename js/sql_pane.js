var sql_pane = function(query) {
  return this.newInstance(query);
}
sql_pane.panes = [];
sql_pane.init = function() {
  $("#queryform").submit(function(e) {
    e.preventDefault();
    sql_pane.panes.push(new sql_pane($("#querybox").val()));
    return false;
  });
}

sql_pane.counter = 1;
sql_pane.prototype.newInstance = function(query) {
  var instance = {
    query: query,
    id:sql_pane.counter++
  };
  this.createResultUI.bind(instance).call();
  database.execute(query, this.render.bind(instance));
  return instance;
};

sql_pane.prototype.createResultUI = function() {
  var title = document.createElement("a");
  $(title).attr('href','#result_' + this.id).attr('data-toggle','tab')
      .html("Result");
  var tab = document.createElement("li");
  $(tab).append(title);
  $("#results>ul").append(tab);

  var container = document.createElement("div");
  $(container).addClass("tab-pane").attr('id','result_' + this.id)
      .html("Loading!");
  $("#results>.tab-content").append(container);

  $(title).tab('show');
};

sql_pane.prototype.render = function(data) {
};