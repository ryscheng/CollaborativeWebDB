init();
var ssocketId;
var clientToServerMsg = "HELLO! THIS IS THE STORY OF MY LIFE. I WAS BORN AS A YOUNG BOY. THEN A BUNCH OF STUFF HAPPENED. ESSENTIALLY, THIS IS A LONG STORY. LONG LONG LONG";
var msgLength = 145;

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
  var connection = new WebP2PWrapper();
  connection.getPublicIp(function (msg) {
    console.log(JSON.stringify(msg));
    connection.createServerSocket(function (msg) {
      console.log("CreateServerSocket:"+JSON.stringify(msg));
      ssocketId = msg.ssocketId;
      connection.listen(ssocketId, function (msg) {
        console.log("ServerListen:"+JSON.stringify(msg));
        connection.accept(ssocketId, function (msg) {
          console.log("ServerAccept:"+JSON.stringify(msg));
          connection.read(msg.socketId, msgLength, function(msg) {
            console.log("ServerRead:"+JSON.stringify(msg));
          connection.read(msg.request.socketId, msgLength, function(msg) {
            console.log("ServerRead:"+JSON.stringify(msg));
            connection.disconnect(msg.request.socketId, function (msg) {
              console.log("ServerDisconnect:"+JSON.stringify(msg));
              connection.destroy(msg.request.socketId, function (msg) {
                console.log("ServerDestroy:"+JSON.stringify(msg));
                connection.stopListening(ssocketId, function (msg) {
                  console.log("ServerStopListening:"+JSON.stringify(msg));
                  connection.destroyServerSocket(ssocketId, function (msg) {
                    console.log("ServerDestroyServerSocket:"+JSON.stringify(msg));
        });});});});});});});
        connection.createSocket(function(msg) {
          console.log("CreateClientSocket:"+JSON.stringify(msg));
          connection.connect(msg.socketId, "127.0.0.1", 9229, function (msg) {
            console.log("ClientConnect:"+JSON.stringify(msg));
              connection.write(msg.request.socketId, clientToServerMsg, function (msg) {
                console.log("ClientWrite:"+JSON.stringify(msg));
              connection.write(msg.request.socketId, clientToServerMsg, function (msg) {
                console.log("ClientWrite:"+JSON.stringify(msg));
                connection.disconnect(msg.request.socketId, function(msg) {
                  console.log("ClientDisconnect:"+JSON.stringify(msg));
                  connection.destroy(msg.request.socketId, function(msg) {
                    console.log("ClientDestroy:"+JSON.stringify(msg));
        });});});});});});
  });});});
}

