var instacdn_cache = {};

window.addEventListener('load', function() {
  console.log("Connecting to server.");
  /**
  server.start();
  server.socket.onopen = function() {
    log.write("Connected to server.");
    server.write({
      event:'register'
    });
  }
  server.subscribers.push(function(msg) {
    log.write("Server Message received: " + JSON.stringify(msg));
  });
  server.subscribers.push(node.onServerMessage.bind(node));
  **/
}, false);

function http_get(url) {
  var req = new XMLHttpRequest();
  req.overrideMimeType('text/plain; charset=x-user-defined');
  req.open("GET", url, false);
  req.send(null);
  var binary = '';
  for (var i = 0; i < req.responseText.length; i++) {
    binary += String.fromCharCode(req.responseText.charCodeAt(i) & 0xFF);
  }
  return binary;
}

function getMimeTypeFromUrl(url) {
  url = url.toLowerCase();
  var tokens = url.split('.');
  var ext = tokens[tokens.length-1];
  if (ext == "png")
    return "image/png";
  else if (ext == "gif")
    return "image/gif";
  else if (ext == "jpg" || ext == "jpeg")
    return "image/jpeg";
  else
    return "text/plain";
}

function instacdn_fetch(img, url) {
  if (!img.rewritten) {
    if (!(url in instacdn_cache)) {
      console.log("Fetching " + url);
      instacdn_cache[url] = http_get(url);
    }
    var newUrl = "data:" + getMimeTypeFromUrl(url) + ";base64,";
    newUrl += window.btoa(instacdn_cache[url]);
    img.src = newUrl;
    img.rewritten = true;
  }
}
