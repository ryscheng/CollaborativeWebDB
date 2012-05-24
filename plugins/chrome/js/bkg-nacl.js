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
  contentScripts[result.request.portname].port.postMessage(result);
}

function ContentScriptConnection(port) {
  this.port = port;
  this.onRead = function(socketEvent) {
  }

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
      naclmodule.postMessage(JSON.stringify(msg));
    }
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
  port.onMessage.addListener(contentScripts[port.name].onMessage);
}
