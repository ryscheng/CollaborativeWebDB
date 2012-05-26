var WebP2PExtensionPort = chrome.extension.connect({name: window.location.origin});
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
  window.postMessage({to: "page", msg: msg}, window.location.origin);
}
