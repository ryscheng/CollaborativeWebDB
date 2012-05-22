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
  connection.getIdentifier(function (msg) {
    console.log(JSON.stringify(msg));
    connection.createServerSocket(function(msg) {
      console.log("CreateServerSocket:"+JSON.stringify(msg));
      connection.listen(function (msg) {
        console.log("Listen:"+JSON.stringify(msg));
        connection.accept(function (msg) {
          console.log("Accept:"+JSON.stringify(msg));
          connection.stoplistening(function (msg) {
            console.log("StopListening:"+JSON.stringify(msg));
          });
        });
      });
    });
  });
}

function consoleLog(msg) {
  console.log(msg);
}
