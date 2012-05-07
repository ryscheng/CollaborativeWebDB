var log = {
  start: function(vis) {
    if (vis) {
      var title = document.createElement("a");
      $(title).attr('href','#log').attr('data-toggle','tab').html("Log");
      var tab = document.createElement("li");
      $(tab).append(title);
      $("#results>ul").append(tab);

      var container = document.createElement("div");
      $(container).addClass("tab-pane").attr('id','log');
      $("#results>.tab-content").append(container);
    }

    this.el = document.createElement("pre");
    if (vis) {
      $("#log").append(this.el);
    }
  },
  write: function(msg) {
    $(this.el).append(msg + "\n\r");
  }
};
