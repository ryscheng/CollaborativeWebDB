var describe_pane = function(query) {
  return this.newInstance(query);
}
describe_pane.panes = [];
describe_pane.init = function() {
  $("#describer").click(function(e) {
    describe_pane.panes.push(new describe_pane($("#querybox").val()));
    return false;
  });
};

describe_pane.counter = 1;
describe_pane.prototype.newInstance = function(query) {
  var instance = {
    query: query,
    id:describe_pane.counter++
  };

  this.createResultUI.bind(instance).call();
  this.explain.bind(instance).call();  
  return instance;
};

describe_pane.prototype.createResultUI = function() {
  var title = document.createElement("a");
  $(title).attr('href','#describe_' + this.id).attr('data-toggle','tab')
      .html("Plan ");
  var tab = document.createElement("li");
  $(tab).append(title);
  $("#results>ul").append(tab);

  this.element = document.createElement("div");
  $(this.element).addClass("tab-pane").attr('id','describe_' + this.id)
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

describe_pane.prototype.explain = function() {
  var q;
  try {
    q = pegjs_sql.parse(this.query);
  } catch (e) {
    $(this.element).html('<pre>' + e + '</pre>');
    return;
  }
    $(this.element).html('<pre>' + describe_pane.recursivelyPrint(q,"") + '</pre>');  
};

describe_pane.recursivelyPrint = function(query,i) {
  var ret = "";
  for (var x in query) {
    ret += i + x;
    if (typeof query[x] != "object") {
      ret += ": " + query[x] + "\n";
    } else {
      ret += ":\n";
      ret += describe_pane.recursivelyPrint(query[x], i + "  ");
    }
  }
  return ret;
};