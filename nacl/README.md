WebP2P NaCl Socket API
======================

Provides a Javascript API to raw network sockets through a NaCl app
Built for Pepper API 18
Tested on Chrome Beta Channel (Google Chrome 19.0.1084.41 (Official Build 134854) beta)
  on Ubuntu 64-bit

Compile
-------
In order to get it running, do the following:
  export NACL_SDK_ROOT=<path-to-nacl_sdk/pepper-18/>
  make

Run
---
In order to run, start the server, then navigate to http://localhost:5103
  python httpd.py
