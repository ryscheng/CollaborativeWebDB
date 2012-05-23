var contentScripts = new Object();
init();

function init(){
  console.log("WebP2P Chrome Sockets Transport init()");
  chrome.extension.onConnect.addListener(onContentScriptConnect);

  console.log(chrome.experimental.socket);
  var statusField = document.getElementById('sock_status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
}

function ContentScriptConnection(port) {
  this.port = port;
  this.onRead = function(socketEvent) {
  }

  this.onMessage = function(msg) {
    console.log("MSG from "+port.name);
    console.log(msg);
    if (msg.command == COMMANDS.create) {
      chrome.experimental.socket.create(msg.type, msg.address, msg.port, function(socketInfo) {
        port.postMessage({request: msg, socketInfo: socketInfo});
      });
    } else if (msg.command == COMMANDS.connect) {
      chrome.experimental.socket.connect(msg.socketId, function(result) {
        port.postMessage({request: msg, result: result});
      });
    } else if (msg.command == COMMANDS.disconnect) {
      chrome.experimental.socket.disconnect(msg.socketId);
    } else if (msg.command == COMMANDS.destroy) {
      chrome.experimental.socket.destroy(msg.socketId);
    } else if (msg.command == COMMANDS.read) {
      chrome.experimental.socket.read(msg.socketId, function(socketEvent) {
        port.postMessage({request: msg, socketEvent: socketEvent});
      });
    } else if (msg.command == COMMANDS.write) {
      chrome.experimental.socket.write(msg.socketId, msg.data, function(writeInfo) {
        port.postMessage({request: msg, writeInfo: writeInfo});
      });
    } else if (msg.command == COMMANDS.getpublicip) {
      function parseDomForIp(dom) {
        var ip = dom.split("IP Address: ")[1].split("</body>")[0];
        port.postMessage({request: msg, result: ip});
      }
      $.get(GETIPURL, {}, parseDomForIp);
    }
    
  }
}

function onContentScriptConnect(port) {
  console.log("New Content script: " + port.name);
  contentScripts[port.name] = new ContentScriptConnection(port);
  port.onMessage.addListener(contentScripts[port.name].onMessage);
}
