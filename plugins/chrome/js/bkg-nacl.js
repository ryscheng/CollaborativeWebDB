var naclmodule = null;  // Global application object.
var contentScripts = new Object();
var globalCounter = 0;
init();

function init() {
  console.log("WebP2P NaCl Transport init()");
  var listener = document.getElementById('nacl_listener');
  chrome.extension.onConnect.addListener(onContentScriptConnect);
  listener.addEventListener('load', moduleDidLoad, true);
  listener.addEventListener('message', handleMessage, true);
}

//Store port to a new application page
function onContentScriptConnect(port) {
  port.id = globalCounter++;
  console.log("New Content script: " + port.id);
  contentScripts[port.id] = new ContentScriptConnection(port);
  port.onMessage.addListener(contentScripts[port.id].onMessageFromApp.bind(contentScripts[port.id]));
  port.onDisconnect.addListener(contentScripts[port.id].onDisconnect.bind(contentScripts[port.id]));
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
    if (contentScripts[result.request.portid]) {
      contentScripts[result.request.portid].onMessageFromNacl(result);
    }
  }
}

function ContentScriptConnection(port) {
  this.port = port;
  this.sockets = [];
  this.listeners = [];
  this.readwriteops = new Object();

  this.onMessageFromApp = function(msg) {
    msg.id = globalCounter++;
    msg.portid = port.id;
    console.log("MSG:"+port.id+"::"+JSON.stringify(msg));
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
          (msg.request.command != COMMANDS.read && msg.request.command != COMMANDS.write)) {
      this && this.port && this.port.postMessage(msg);
    } else if (msg.request.command == COMMANDS.read) {
      var transportLength = JSON.stringify([msg.data]).length - 4;
      if (transportLength >= msg.request.numBytes) {
        this && this.port && this.port.postMessage(msg);        
      } else {
        //request again
        this.readwriteops[msg.request.id] = msg;
        msg.request.numBytes -= transportLength;
        console.log("Read Continuation:" + JSON.stringify(msg.request));
        naclmodule.postMessage(JSON.stringify(msg.request));
      }
    } else if (msg.request.command == COMMANDS.write) {
      var transport = JSON.stringify([msg.request.data]);
      var transportLength = transport.length - 4;
      if (transportLength <= msg.result) {
        this && this.port && this.port.postMessage(msg);        
      } else {
        //request again
        this.readwriteops[msg.request.id] = msg;
        var newReq = JSON.parse(JSON.stringify(msg.request));
        msg.request.data = JSON.parse("[\"" + transport.substr(2 + msg.result))[0];
        console.log("Write continuation:"+JSON.stringify(msg.request));
        naclmodule.postMessage(JSON.stringify(msg.request));
      }
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
    delete contentScripts[this.port.id];
  }
}


function requestPermissions(origin) {
  chrome.permissions.request({
    origins: [ origin ]
  }, function(result) {
    console.log('done ' + result);
  });
}


