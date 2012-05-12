init()

function init() {
  console.log("WebP2P init()");
  chrome.browserAction.onClicked.addListener(startNaclDemo);
}

function startNaclDemo(tab) {
  chrome.tabs.create({url:chrome.extension.getURL("nacl_test.html")});
}
