//var bkg = chrome.extension.getBackgroundPage();
var port = chrome.extension.connect({name: window.location.origin});
init();

function init() {
  console.log("Content Script Init()");
  port.onMessage.addListener(receiveFromBkg);
  window.addEventListener("message", receiveFromPage, false);
}

function receiveFromPage(event){
  if (event.data.to == "extension") {
    port.postMessage(event.data.msg);
  }
}

function receiveFromBkg(msg) {
  window.postMessage({to: "page", msg: msg}, window.location.origin);
}
