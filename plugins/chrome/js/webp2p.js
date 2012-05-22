var WEBP2PVERSION = 1;
var DEFAULT_PORT = 9229;
var WEBP2PMAXCALLBACKS = 10;
var WebP2PCallbacks = {};
var WebP2PCallbackIndex = 0;
WebP2PInit();

function WebP2PInit() {
  console.log("WebP2P Init()");
  window.addEventListener("message", webp2pReceiveMessage, false);
}

function getWebP2PVersion() {
  return WEBP2PVERSION;
}

function sendCommand(msg, callback){
  msg.id = WebP2PCallbackIndex;
  window.postMessage({to: "extension", msg: msg}, window.location.origin);
  WebP2PCallbacks[WebP2PCallbackIndex] = callback;
  WebP2PCallbackIndex++;
}

function webp2pReceiveMessage(event){
  if ((typeof event.data.to !== 'undefined') && (event.data.to == "page")) {
    WebP2PCallbacks[event.data.msg.request.id](event.data.msg);
    delete WebP2PCallbacks[event.data.msg.request.id];
  }
}

function PeerConnection() {
  this.getIdentifier = function(callback) {
    sendCommand({command: COMMANDS.getpublicip}, callback);
  }
  this.createServerSocket = function(callback) {
    sendCommand({command: COMMANDS.createserversocket}, callback);
  }
  this.listen = function(callback) {
    sendCommand({command: COMMANDS.listen, port: DEFAULT_PORT}, callback);
  }
  this.accept = function(callback) {
    sendCommand({command: COMMANDS.accept}, callback);
  }
  this.stoplistening = function(callback) {
    sendCommand({command: COMMANDS.stoplistening}, callback);
  }

}
