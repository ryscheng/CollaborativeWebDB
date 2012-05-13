Web P2P
=======

Components
----------

* This folder (and css,img,js)
   The Client code and javascript libraries for a P2P web application.
* Server
   The Python web server for topology coordination.
* Npapi
   A chrome extension for P2P communication using an NPAPI plugin.
* NaCl
   A chrome extension to P2P communication using a NaCl module.

Running
-------

    git submodule init
    git submodule update
    cd server
    python webp2p.py

Then, in a browser visit http://localhost:8080/

Layout
------

webp2p.js Composes the application.  *_pane.js contain display logic for the
various application components.

log.js Provides common logging capabilities.

peer.js contains the server and node classes, and provides the topology
API, through which other active peers can be discovered and
communicated with.

d3.js is the http://d3js.org visualization library.

bootstrap.js is the http://http://twitter.github.com/bootstrap/ style library.

jsinq.js and jsinq-query.js provide linq parsing, lexing, and evaluation in
javascript.  These are lightly modified from http://jsinq.codeplex.com

sql.js provides a database abstraction on top of jsinq, which attempts to
pull data from the server or other clients when it is not available locally.