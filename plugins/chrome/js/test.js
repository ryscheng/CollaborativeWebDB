init();

function init() {
  console.log("Test Init()");
  var button = document.getElementById('button');
  button.onclick = buttonClick
  var statusField = document.getElementById('status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
}

function buttonClick() {
  console.log("CLICK");
  var connection = new PeerConnection();
  connection.getPublicIp(function (msg) {
    console.log(JSON.stringify(msg));
    connection.createServerSocket(function(msg) {
      console.log("CreateServerSocket:"+JSON.stringify(msg));
      connection.listen(function (msg) {
        console.log("ServerListen:"+JSON.stringify(msg));
        connection.accept(function (msg) {
          console.log("ServerAccept:"+JSON.stringify(msg));
          connection.read(msg.socketId, 17, function(msg) {
            console.log("ServerRead:"+JSON.stringify(msg));
            connection.disconnect(msg.request.socketId, function (msg) {
              console.log("StopListening:"+JSON.stringify(msg));
            });
            connection.destroy(msg.request.socketId, function (msg) {
              console.log("StopListening:"+JSON.stringify(msg));
            });
            connection.stoplistening(function (msg) {
              console.log("StopListening:"+JSON.stringify(msg));
            });
          });
        });
        connection.createSocket(function(msg) {
          console.log("CreateClientSocket:"+JSON.stringify(msg));
          connection.connect(msg.socketId, "127.0.0.1", 9229, function (msg) {
            console.log("ClientConnect:"+JSON.stringify(msg));
            connection.write(msg.request.socketId, "HELLO FROM CLIENT", function (msg) {
              console.log("ClientWrite:"+JSON.stringify(msg));
              connection.disconnect(msg.request.socketId, function(msg) {
                console.log("ClientDisconnect:"+JSON.stringify(msg));
                connection.destroy(msg.request.socketId, function(msg) {
                  console.log("ClientDestroy:"+JSON.stringify(msg));
                });
              });
            });
          });
        })
      });
    });
  });
}

function consoleLog(msg) {
  console.log(msg);
}
