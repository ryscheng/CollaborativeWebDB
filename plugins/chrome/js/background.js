var naclmodule = null;  // Global application object.
var statusText = 'NO-STATUS';
var logdiv = document.getElementById('log');
var logData = [];
init()

function init() {
  log("WebP2P NaCl Transport init()");
  var listener = document.getElementById('listener');
  listener.addEventListener('load', moduleDidLoad, true);
  listener.addEventListener('message', handleMessage, true);
}

function log(msg){
  console.log(msg);
  /**
  logData.push(msg);
  var logStr = "";
  for (var i=0; i<logData.length; i++) {
    logStr = logData[i] + "<br>";
  }
  logdiv.innerHTML = logStr;
  **/
}

// Indicate load success.
function moduleDidLoad() {
  updateStatus('SUCCESS');
  naclmodule = document.getElementById('nacl_transport');
  naclmodule.postMessage('LOADED');
}

// The 'message' event handler.  This handler is fired when the NaCl module
// posts a message to the browser by calling PPB_Messaging.PostMessage()
// (in C) or pp::Instance.PostMessage() (in C++).  This implementation
// simply displays the content of the message in an alert panel.
function handleMessage(message_event) {
  log("nacl: "+message_event.data);
}

// Set the global status message.  If the element with id 'statusField'
// exists, then set its HTML to the status message as well.
// opt_message The message test.  If this is null or undefined, then
// attempt to set the element with id 'statusField' to the value of
// |statusText|.
function updateStatus(opt_message) {
  if (opt_message)
    statusText = opt_message;
  var statusField = document.getElementById('status_field');
  if (statusField) {
    statusField.innerHTML = statusText;
  }
}

