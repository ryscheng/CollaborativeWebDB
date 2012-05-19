var WEBP2PVERSION = 1;
WebP2PInit();

function WebP2PInit() {
  console.log("WebP2P Init()");
  window.addEventListener("message", webp2pReceiveMessage, false);
}

function getWebP2PVersion() {
  return WEBP2PVERSION;
}

function webp2pReceiveMessage(event){
  if (event.data.to == "page") {
    console.log("received msg");
    console.log(event.data.msg);
  }
}

function PeerConnection() {
  this.getIdentifier = function(callback) {
    window.postMessage({to: "extension", msg: {command: COMMANDS.getidentifier}}, window.location.origin);
  }

}
