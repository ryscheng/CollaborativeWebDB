var describe_pane = function(query) {
  if (query.trim().toLowerCase().indexOf("explain ") === 0) {
    this.query = query;
  } else {
    this.query = "explain " + query;
  }
  this.id = describe_pane.counter++;
  this.beginQuery();

  return this;
}

describe_pane.panes = [];
describe_pane.counter = 1;
describe_pane.init = function() {
  $("#queryform").submit(function(e) {
    e.preventDefault();
    return false;
  });
  $("#describer").click(function(e) {
    describe_pane.panes.push(new describe_pane($("#querybox").val()));
    return false;
  });
};

describe_pane.prototype.beginQuery = function() {
  this.createResultUI();
  database.execute(this.query, this.renderData.bind(this));
};


describe_pane.prototype.createResultUI = function() {
  var title = document.createElement("a");
  $(title).attr('href','#desc_' + this.id).attr('data-toggle','tab')
      .html("Description ");
  var tab = document.createElement("li");
  $(tab).append(title);
  $("#results>ul").append(tab);

  this.element = document.createElement("div");
  $(this.element).addClass("tab-pane").attr('id','desc_' + this.id)
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

describe_pane.prototype.renderData = function(data, error) {
  if (!this.results) {
    this.results = document.createElement('pre');
    this.element.innerHTML = "";
    this.element.appendChild(this.results);
  }
  if (data) {
    var d = document.createElement("span");
    var n = "";
    if (typeof data == "string") {
      n = data;
    } else {
      for (var i in data) {
        n += i + ":" + data[i] + "\n";
      }
    }
    d.innerHTML = n;
    this.results.appendChild(d);
  }
};