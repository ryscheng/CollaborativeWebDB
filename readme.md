Web P2P
=======

Components
----------

* This folder
  The Javascript API for a P2P web application.
* Server
  The Python web server for topology coordination.
* Npapi
  The chrome extension to expose P2P pre-WebRTC.

Running
-------

    git submodule init
    get submodule update
    cd server
    python webp2p.py

Then, in a browser visit http://localhost:8080/

Layout
------

webp2p.js is the main application logic, and performs capability checks
and setup.

log.js is the common utility functions, right now just logging capabilities.

peer.js contains the server and node classes, and provides the topology
api level, through which other active peers can be discovered and
communicated with.
