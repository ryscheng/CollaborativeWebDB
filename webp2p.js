function localView() {
    navigator.getUserMedia_("video", successCallback, errorCallback);
    function successCallback(stream) {
      console.log(stream);
      $('#myview').attr("src", window.webkitURL ? window.webkitURL.createObjectURL(stream) : stream);
    }
    function errorCallback(error) {
      console.error('An error occurred: [CODE ' + error.code + ']');
      $('#output').html('An error occurred: ' + error);
      return;
    }
};

$(document).ready(function() {
  //Show alert on click
  $('video').click(function() {
    alert("Hello world!");
  });

  //Replace the source of the video element with the stream from the camera
  navigator.getUserMedia_ = navigator.getUserMedia || navigator.webkitGetUserMedia;
  if(!!navigator.getUserMedia_ !== false) {
    localView();
  } else {
    console.log('Native web camera streaming (getUserMedia) is not supported in this browser.');
    $('#output').html('Sorry, your browser doesn\'t support getUserMedia. ')
      .append('<p>Try Chrome canary or dev channel ')
      .append('with enabling MediaStream at chrome://flags ')
      .append('(To be sure that it is now experimental ')
      .append("and don't forget to set --enable-media-stream ")
      .append("as a execute parameter)")
      .append('</p>')
    return;
  }
});
