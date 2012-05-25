var naclmodule = null;  // Global application object.
var contentScripts = new Object();
init()

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
  } else if (result.request.command == COMMANDS.createserversocket &&
    result.result == "PP_OK") {
    contentScripts[result.request.portname].listeners.push(result.ssocketId);
  } else if (result.request.command == COMMANDS.destroy && 
    result.result == "PP_OK") {
    contentScripts[result.request.portname].sockets.splice(
        contentScripts[result.request.portname].sockets.indexOf(result.request.socketId),1);
  } else if (result.request.command == COMMANDS.destroyserversocket && 
    result.result == "PP_OK") {
    contentScripts[result.request.portname].listeners.splice(
        contentScripts[result.request.portname].listeners.indexOf(result.request.ssocketId),1);
  }
  contentScripts[result.request.portname] &&
    contentScripts[result.request.portname].port.postMessage(result);
}

function ContentScriptConnection(port) {
  this.port = port;
  this.onRead = function(socketEvent) {
  }
  
  this.sockets = [];
  this.listeners = [];

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
      if (msg.command.socketId && this.sockets.indexOf(msg.command.socketId) === -1) {
        port.postMessage({request: msg, error: 'unrecognized socket'});
        reutrn;
      }
      if (msg.command.ssocketId && this.listeners.indexOf(msg.command.ssocketId) === -1) {
        port.postMessage({request: msg, error: 'unrecognized ssocket'});
        return;
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
      for (var i = 0; i < this.listeners.length; i++) {
        naclmodule.postMessage(JSON.stringify({command: COMMANDS.destroyserversocket, ssocketId: this.listeners[i]}));
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
