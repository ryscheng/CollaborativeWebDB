# Edit for your paths
EMSCRIPTEN=/home/vagrant/src/emscripten
EMCC=$(EMSCRIPTEN)/emcc -O2
# -s INLINING_LIMIT=0
CFLAGS=-DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0

all: sql.js

sql.js: sqlite3.c
	$(EMCC) $(CFLAGS) sqlite3.c main.c --pre-js pre.js --post-js post.js -o sql.js -s EXPORTED_FUNCTIONS="['_sqlite3_open', '_sqlite3_close', '_sqlite3_exec']"

clean:
	rm sql.js

