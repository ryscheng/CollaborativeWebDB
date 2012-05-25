var naclmodule = null;  // Global application object.
var contentScripts = new Object();
init();

function init() {
  console.log("WebP2P NaCl Transport init()");
  var listener = document.getElementById('nacl_listener');
  chrome.extension.onConnect.addListener(onContentScriptConnect);
  chrome.extension.onRequest.addListener(onLoadRequest);
  listener.addEventListener('load', moduleDidLoad, true);
  listener.addEventListener('message', handleMessage, true);
}

function moduleDidLoad() {
  var statusField = document.getElementById('nacl_status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
  naclmodule = document.getElementById('nacl_transport');
}

function handleMessage(message_event) {
  console.log("from nacl: "+message_event.data);
  var result = JSON.parse(message_event.data);
  if (result.request.command == COMMANDS.createsocket &&
    result.result == "PP_OK") {
    contentScripts[result.request.portname].sockets.push(result.socketId);
  } else if (result.request.command == COMMANDS.listen &&
    result.result == "PP_OK") {
    contentScripts[result.request.portname].listening = true;
  } else if (result.request.commands == COMMANDS.stoplistening &&
    result.result == "PP_OK") {
    contentScripts[result.request.portname].listening = false;
  }
  contentScripts[result.request.portname] &&
    contentScripts[result.request.portname].port.postMessage(result);
}

function ContentScriptConnection(port) {
  this.port = port;
  this.onRead = function(socketEvent) {
  }
  
  this.sockets = [];
  this.listening = false;

  this.onMessage = function(msg) {
    msg.portname = port.name;
    console.log("MSG:"+port.name+"::"+JSON.stringify(msg));
    if (msg.command == COMMANDS.getpublicip) {
      function parseDomForIp(dom) {
        var ip = dom.split("IP Address: ")[1].split("</body>")[0];
        port.postMessage({request: msg, result: ip});
      }
      $.get(GETIPURL, {}, parseDomForIp);
    } else if (naclmodule == null) {
      port.postMessage({request: msg, error: 'NaCl module not loaded'});
    } else {
      if (msg.command == COMMANDS.destroy) {
        var sid = msg.socketId;
        for (var i = 0; i < this.sockets.length; i++) {
          if(this.sockets[i] == sid) {
            this.sockets.splice(i,1);
            break;
          }
        }
      }
      naclmodule.postMessage(JSON.stringify(msg));
    }
  };
  
  
  this.onDisconnect = function(evt) {
    console.log('Content script disconnected!');
    // clean up.
    if (naclmodule != null) {
      for (var i = 0; i < this.sockets.length; i++) {
        naclmodule.postMessage(JSON.stringify({command: COMMANDS.destroy, socketId: this.sockets[i]}));
      }
      if (this.listening) {
        console.log('told nacl to stop listening');
        naclmodule.postMessage(JSON.stringify({command: COMMANDS.stoplistening}));
      }
    }
    delete contentScripts[this.port.name];
  }
}

function onLoadRequest(req, sender, resp) {
  if (req.to != 'bg') return;
  var origin = sender.tab.url;
  chrome.tabs.executeScript(sender.tab.tabId, {file: "js/contentscript.js"});
}

function requestPermissions(origin) {
  chrome.permissions.request({
    origins: [ origin ]
  }, function(result) {
    console.log('done ' + result);
  });
}

function onContentScriptConnect(port) {
  console.log("New Content script: " + port.name);
  contentScripts[port.name] = new ContentScriptConnection(port);
  port.onMessage.addListener(contentScripts[port.name].onMessage.bind(contentScripts[port.name]));
  port.onDisconnect.addListener(contentScripts[port.name].onDisconnect.bind(contentScripts[port.name]));
}
