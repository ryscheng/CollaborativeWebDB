var naclmodule = null;  // Global application object.
var contentScripts = new Object();
var globalCounter = 0;
init();

function init() {
  console.log("WebP2P NaCl Transport init()");
  var listener = document.getElementById('nacl_listener');
  chrome.extension.onConnect.addListener(onContentScriptConnect);
  chrome.extension.onRequest.addListener(onLoadRequest);
  listener.addEventListener('load', moduleDidLoad, true);
  listener.addEventListener('message', handleMessage, true);
}

//Store port to a new application page
function onContentScriptConnect(port) {
  console.log("New Content script: " + port.name);
  contentScripts[port.name] = new ContentScriptConnection(port);
  port.onMessage.addListener(contentScripts[port.name].onMessageFromApp.bind(contentScripts[port.name]));
  port.onDisconnect.addListener(contentScripts[port.name].onDisconnect.bind(contentScripts[port.name]));
}

//Called to inject content script into an application
function onLoadRequest(req, sender, resp) {
  if (req.to != 'bg') return;
  var origin = sender.tab.url;
  chrome.tabs.executeScript(sender.tab.tabId, {file: "js/contentscript.js"});
}

//Updates background page status field if NaCl module loads
function moduleDidLoad() {
  var statusField = document.getElementById('nacl_status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
  naclmodule = document.getElementById('nacl_transport');
}

//Forward messages from NaCl to correct application port
function handleMessage(message_event) {
  console.log("from nacl: "+message_event.data);
  if (message_event.data.substr(0,5) != "Error") {
    var result = JSON.parse(message_event.data);
    contentScripts[result.request.portname].onMessageFromNacl(result);
  }
}

function ContentScriptConnection(port) {
  this.port = port;
  this.sockets = [];
  this.listeners = [];
  this.readwriteops = new Object();

  this.onMessageFromApp = function(msg) {
    msg.id = globalCounter++;
    msg.portname = port.name;
    console.log("MSG:"+port.name+"::"+JSON.stringify(msg));
    //This is the only operation not forwarded to NaCl and just done in JS
    if (msg.command == COMMANDS.getpublicip) {
      function parseDomForIp(dom) {
        var ip = dom.split("IP Address: ")[1].split("</body>")[0];
        port.postMessage({request: msg, result: ip});
      }
      $.get(GETIPURL, {}, parseDomForIp);
    } else if (naclmodule == null) {
      port.postMessage({request: msg, error: 'NaCl module not loaded'});
    } else { //Forbid access to another app's sockets
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
    //Declare ownership of sockets created by this application
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
   
    //Combine previous results if read or write
    if (this.readwriteops.hasOwnProperty(msg.request.id)) {
      var old = this.readwriteops[msg.request.id];
      msg.request = old.request;
      if (msg.request.command == COMMANDS.read) {
        msg.data = old.data + msg.data;
      }
      if (msg.result >= 0) { //Leave errors intact
        msg.result = old.result + msg.result;
      }
      delete this.readwriteops[msg.request.id];
    }
    //Return errors and completed results
    if (msg.result < 0 ||
          (msg.request.command != COMMANDS.read && msg.request.command != COMMANDS.write) ||
          (msg.request.command == COMMANDS.read && msg.data.length >= msg.request.numBytes) ||
          (msg.request.command == COMMANDS.write && msg.request.data.length <= msg.result)) {
      this && this.port.postMessage(msg);
    } else { //Request again
      this.readwriteops[msg.request.id] = msg;
      var newReq = JSON.parse(JSON.stringify(msg.request));
      if (newReq.command == COMMANDS.read) {
        newReq.numBytes = msg.request.numBytes-msg.data.length;
      } else if (newReq.command == COMMANDS.write) {
        newReq.data = newReq.data.substr(msg.result);
      }
      console.log("Try again:"+JSON.stringify(newReq));
      naclmodule.postMessage(JSON.stringify(newReq));
    }
  };
  
  //Cleanup all sockets and server sockets from this application
  this.onDisconnect = function(evt) {
    console.log('Content script disconnected!');
    // clean up.
    if (naclmodule != null) {
      for (var i = 0; i < this.sockets.length; i++) {
        naclmodule.postMessage(JSON.stringify({command: COMMANDS.destroy, socketId: this.sockets[i], id: Math.floor(Math.random()*MAX_INT)}));
      }
      for (var i = 0; i < this.listeners.length; i++) {
        naclmodule.postMessage(JSON.stringify({command: COMMANDS.destroyserversocket, ssocketId: this.listeners[i], id: Math.floor(Math.random()*MAX_INT)}));
      }
    }
    delete contentScripts[this.port.name];
  }
}


function requestPermissions(origin) {
  chrome.permissions.request({
    origins: [ origin ]
  }, function(result) {
    console.log('done ' + result);
  });
}


