WebP2P NaCl Socket API
======================

Provides a Javascript API to raw network sockets through a NaCl app
Built for Pepper API 19
Tested on Chrome Beta Channel (Google Chrome 19.0.1084.41 (Official Build 134854) beta)
  on Ubuntu 64-bit

Compile
-------
In order to get it running, do the following:
  export NACL_SDK_ROOT=<path-to-nacl_sdk/pepper-19/>
  cd src/
  make

Run
---
In order to get it running,
  Install unpacked extension in Google Chrome
  Note the <extensionid>
  Close Google Chrome
  Reopen Google Chrome with the right flags
    --enable-nacl 
    --allow-nacl-socket-api="<extensionid>" 
    --enable-media-stream 
    --enable-experimental-extension-apis 
    For hints, look at openchrome.sh
  Run the python script
    python httpd.py
  Open http://localhost:5103
  Check the javascript console for both the background page and opened page

