init();

function init() {
  console.log("NaCl Test Init()");
  window.addEventListener("message", receiveMessage, false);
  var button = document.getElementById('button');
  button.onclick = buttonClick
  var statusField = document.getElementById('status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
}

function receiveMessage(event){
  if (event.data.to == "page") {
    console.log("NaCl Test sees: "+event.data.msg);
  }
}

function buttonClick() {
  console.log("CLICK");
  window.postMessage({to: "extension", msg: {command: "POOP", msg: "WOo WOoo"}}, window.location.origin);
}

function getVersionNacl() {

}

function getIdentifierNacl() {

}

function connectNacl(identifier) {

}

function sendDataNacl(msg) {

}
