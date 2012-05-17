# Edit for your paths
EMSCRIPTEN=/home/vagrant/src/emscripten
EMCC=$(EMSCRIPTEN)/emcc -O2
EMCCDB=$(EMSCRIPTEN)/emcc
# -s INLINING_LIMIT=0
CFLAGS=-DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0
SQLFLAGS=--pre-js pre.js --post-js postscript.js -o sql.js -s EXPORTED_FUNCTIONS="['_sqlite3_open', '_sqlite3_close', '_sqlite3_exec', '_jsbacked_done', '_jsbacked_init']"

all: sql.js sql-dbg.js

postscript.js: post.js jsbacked.js
	cat jsbacked.js post.js > postscript.js

sql.js: sqlite3.c jsbacked.c postscript.js
	$(EMCC) $(CFLAGS) sqlite3.c jsbacked.c main.c $(SQLFLAGS)

sql-dbg.js: sqlite3.c jsbacked.c postscript.js
	$(EMCCDB) $(CFLAGS) sqlite3.c jsbacked.c main.c c $(SQLFLAGS)

clean:
	rm sql.js sql-dbg.js postscript.js

