var sockId = 0;
init();

function init(){
  console.log("WebP2P Chrome Sockets Transport init()");
  console.log(chrome.experimental.socket);
  chrome.experimental.socket.create('tcp', '127.0.0.1', 5103, function(socketInfo) {
    console.log("Socket created");
    chrome.experimental.socket.connect(socketInfo.socketId, function(result) {
      console.log("Socket connected");
      chrome.experimental.socket.write(socketInfo.socketId, "GET /index.html HTTP/1.1\r\n", function(writeInfo) {
        sockId = socketInfo.socketId;
        console.log("Wrote "+writeInfo.bytesWritten+" bytes");
        chrome.experimental.socket.read(socketInfo.socketId, onRead);
      });
    });
  });
}

function onRead(socketEvt) {
  if (socketEvt.message != "") {
    console.log(socketEvt);
  }
  chrome.experimental.socket.read(sockId, onRead);
}

