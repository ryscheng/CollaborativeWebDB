init();

function init() {
  console.log("Test Init()");
  var button = document.getElementById('button');
  button.onclick = buttonClick
  var statusField = document.getElementById('status_field');
  if (statusField) {
    statusField.innerHTML = 'SUCCESS';
  }
}

function buttonClick() {
  console.log("CLICK");
  var connection = new PeerConnection();
  var id = connection.getIdentifier();
  console.log(id);
}

