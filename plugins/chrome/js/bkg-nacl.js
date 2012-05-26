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
  contentScripts[result.request.portname].onMessageFromNacl(result);
}

function ContentScriptConnection(port) {
  this.port = port;
  this.onRead = function(socketEvent) {
  }
  
  this.sockets = [];
  this.listeners = [];
  this.readwriteops = {};
  this.readBuffer = "";

  this.onMessageFromApp = function(msg) {
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
      if (msg.socketId && this.sockets.indexOf(msg.socketId) === -1) {
        port.postMessage({request: msg, error: 'unrecognized socket'});
        return;
      }
      if (msg.ssocketId && this.listeners.indexOf(msg.ssocketId) === -1) {
        port.postMessage({request: msg, error: 'unrecognized ssocket'});
        return;
      }
      naclmodule.postMessage(JSON.stringify(msg));
    }
  };

  this.onMessageFromNacl = function (msg) {
    if (msg.request.command == COMMANDS.createsocket && msg.resultStr == "PP_OK") {
      this.sockets.push(msg.socketId);
    } else if (msg.request.command == COMMANDS.createserversocket && msg.resultStr == "PP_OK") {
      this.listeners.push(msg.ssocketId);
    } else if (msg.request.command == COMMANDS.accept && msg.resultStr == "PP_OK") {
      this.sockets.push(msg.socketId);
    } else if (msg.request.command == COMMANDS.destroy && msg.resultStr == "PP_OK") {
      this.sockets.splice(this.sockets.indexOf(msg.request.socketId),1);
    } else if (msg.request.command == COMMANDS.destroyserversocket && msg.resultStr == "PP_OK") {
      this.listeners.splice(this.listeners.indexOf(msg.request.ssocketId),1);
    }
    if (msg.request.command == COMMANDS.write && msg.result > 0 && msg.result < msg.request.data.length) {
      msg.request.data = msg.request.data.substr(msg.result);
      console.log("continuation of previous:" + JSON.stringify(msg.request));
      naclmodule.postMessage(JSON.stringify(msg.request));
      return;
    } else if (msg.request.command == COMMANDS.read && msg.result > 0 &&  msg.result < msg.request.numBytes) {
      msg.request.numBytes -= msg.result;
      naclmodule.postMessage(JSON.stringify(msg.request));
      this.readBuffer += msg.data;
      return;
    } else if (msg.request.command == COMMANDS.read && this.readBuffer.length) {
      msg.data = this.readBuffer + msg.data;
      this.readBuffer = "";
    }

    this && this.port.postMessage(msg);
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
  port.onMessage.addListener(contentScripts[port.name].onMessageFromApp.bind(contentScripts[port.name]));
  port.onDisconnect.addListener(contentScripts[port.name].onDisconnect.bind(contentScripts[port.name]));
}
