var describe_pane = {};
describe_pane.init = function() {
  $("#queryform").submit(function(e) {
    e.preventDefault();
    return false;
  });
  $("#describer").click(function(e) {
    var query = $("#querybox").val();
    if (query.trim().toLowerCase().indexOf("explain ") !== 0) {
      query = "explain " + query;
    }
    var pane = new sql_pane(query);
    console.log($('a[href=#result_' + pane.id+']').children());
    $('a[href=#result_' + pane.id+']')[0].childNodes[0].data = "Explain ";
    sql_pane.panes.push(pane);
    return false;
  });
};
