var hash = window.location.hash.substr(1);
var WebP2PExtensionPort = chrome.extension.connect({name: hash});
console.log("Content Script Init()");
WebP2PExtensionPort.onMessage.addListener(receiveFromBkg);
window.addEventListener("message", receiveFromPage, false);

//Forward to the background page
function receiveFromPage(event){
  if ((typeof event.data.to !== 'undefined') && (event.data.to == "extension")) {
    WebP2PExtensionPort.postMessage(event.data.msg);
  }
}

//Forward to the application JS
function receiveFromBkg(msg) {
  top.postMessage({to: "page", msg: msg}, "*");
}
