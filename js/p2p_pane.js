var p2p_pane = {
    _lsid: "p2p_extension_id",
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
     
      var id = localStorage.getItem(p2p_pane._lsid); 
      if (id) {
        p2p_pane.setup(id);
      } else {
        var snippet = "<form class='well'><input type='text' class='span3' placeholder='lhoiocpbddbgjmkkamijhlmhbieacodc'><button type='submit' class='btn'>Connect</button></form>";
        this.el[0].innerHTML = "<div class='alert'><strong>Warning</strong> Extension not connected!" +
            "<br />To connect the extension, go to chrome://extensions, and copy the ID here.</div>" + snippet;
        
        var box = this.el[0].getElementsByTagName('input')[0];
        var button = this.el[0].getElementsByTagName('button')[0];
        
        $(button).click(function(e) {
          e.preventDefault();
          localStorage.setItem(p2p_pane._lsid, box.value);
          p2p_pane.setup(box.value);
          return false;
        });
      }
    },
    setup: function(id) {
        var addr = "chrome-extension://" + id + "/load.html";
        var req_fr = document.createElement('iframe');
        req_fr.src = addr;
        req_fr.style.display='none';
        document.body.appendChild(req_fr);
        req_fr.addEventListener('load', function() {
            $('#p2p')[0].innerHTML = "<p>Extension Communication Log " + 
                "<button type='submit' class='btn'>Disconnect</button>" +
                "</p><pre id='p2plog'></pre>";
            $('#p2p button').click(function(e) {
              localStorage.removeItem(p2p_pane._lsid);
            });
            window.addEventListener('message', p2p_pane.msgTracker, false);

            // Let the extension respond, then restart the server.
            window.setTimeout(function() {
              window._WebP2PServer.state = 0;
              window._WebP2PServer.connect();
            }, 10);
        }, false);
    },
    msgTracker: function(evt) {
      if (evt.data && evt.data.to) {
        $('#p2plog')[0].innerHTML += '\n' + JSON.stringify(evt.data);
      }
    }
};