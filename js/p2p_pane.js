var p2p_pane = {
    init: function() {    
      var title = document.createElement("a");
      $(title).attr('href','#p2p').attr('data-toggle','tab').html("P2P");
      var tab = document.createElement("li");
      $(tab).append(title);
      $("#results>ul").append(tab);

      var container = document.createElement("div");
      $(container).addClass("tab-pane").attr('id','p2p');
      $("#results>.tab-content").append(container);

      this.el = $('#p2p');
      
      var box = document.createElement('input');
      this.el.append(box);
      
      var connectButton = document.createElement('button');
      $(connectButton).text("Connect").click(function(e) {
        e.preventDefault();
        var addr = "chrome-extension://" + box.value + "/load.html";
        var req_fr = document.createElement('iframe');
        req_fr.src = addr;
        $('#p2p').append(req_fr);
        req_fr.style.display='none';
        return false;
      });
      this.el.append(connectButton);
    }
};