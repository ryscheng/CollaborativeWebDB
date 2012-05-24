Web P2P
=======

Components
----------

* This folder (and css,img,js)
   The Client code and javascript libraries for a P2P web application.
* Server
   The Python web server for topology coordination.
* Plugins
   A chrome extension for P2P communication.  The NaCl plugin is working.
* Sqlite
   The sqlite extension, and build environment for compilation to JS.

Running
-------

    git submodule init
    git submodule update
    cd server
    python webp2p.py

Then, in a browser visit http://localhost:8080/

Layout
------

index.html is the outer application, it manages peer connections and display.
In contrast, data.html is the database frame, and handles data management and
queries.  The two are connected by `db_host.js` on index.html and `db_worker.js`
on data.html.

##### index.html layout
webp2p.js Composes the application.  *_pane.js contain display logic for the
various application components.

log.js Provides common logging capabilities.

peer.js contains the server and node classes, and provides the topology
API, through which other active peers can be discovered and
communicated with.

d3.js is the http://d3js.org visualization library.

bootstrap.js is the http://http://twitter.github.com/bootstrap/ style library.

##### data.html layout

sql.js provides a database abstraction on top of sqlite, and handles data
storage and caching.

md5.js is a standard md5 implementation from http://crypto-js.googlecode.com.

sqlite.js is sqlite http://sqlite.org compiled to javascript using emscripten.
Emscripten is located at https://github.com/kripken/emscripten
Sqlite was first compiled to javascript here https://github.com/kripken/sql.js
this project adds the additional code in the sqlite directory, which provides
a `jsbacking` sqlite module, which creates sqlite virtual tables backed by data
from javascript objects.
