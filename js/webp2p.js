window.addEventListener('load', function() {
  // Open the log.
  log.start(window.DEBUG);
  
  // Initialize UI.
  log.write("Initializing User Interface.");
  network_pane.init();

  // Initialize the Server Connection.
  log.write("Connecting to server.");
  server.start();
  server.socket.onopen = function() {
    log.write("Connected to server.");
    server.write({
      event:'register'
    });
  }
  server.subscribers.push(function(msg) {
    log.write("Server Message received: " + JSON.stringify(msg));
  });
  server.subscribers.push(node.onServerMessage.bind(node));
}, false);
