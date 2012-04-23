window.addEventListener('load', function() {
  //Replace the source of the video element with the stream from the camera
  navigator.getUserMedia_ = navigator.getUserMedia || navigator.webkitGetUserMedia;
  if(!!navigator.getUserMedia_ !== false) {
    var peerConnection = window.webkitDeprecatedPeerConnection;
    if (!peerConnection) {
      $('#output').html('Sorry, your browser doesn\'t support a functional peer connection. ')
        .append('<p>Try Chrome canary or dev channel.</p>');
      return;
    }

    log.start(window.DEBUG);
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
  } else {
    console.log('Native web camera streaming (getUserMedia) is not supported in this browser.');
    $('#output').html('Sorry, your browser doesn\'t support getUserMedia. ')
      .append('<p>Try Chrome canary or dev channel ')
      .append('with enabling MediaStream at chrome://flags ')
      .append('(To be sure that it is now experimental ')
      .append("and don't forget to set --enable-media-stream ")
      .append("as a execute parameter)")
      .append('</p>')
    return;
  }
}, false);
