#include "sqlite3ext.h"

#include <malloc.h>
#include <setjmp.h>
#include <string.h>

SQLITE_EXTENSION_INIT1

static int js_version = 1;
static void (*js_backing)(char*,int) = 0;
static void* js_answer = 0;
static jmp_buf buf;
static sqlite3_module js_module;

typedef struct js_vtab_cursor {
  sqlite3_vtab_cursor base;
  sqlite_int64 rowid;
  int eof;
  void** row;
} js_vtab_cursor;

typedef struct js_vtab {
  sqlite3_vtab base;
  sqlite3 *db;
  char *name;
} js_vtab;


enum js_datatype {
  BLOB,
  DOUBLE,
  ERROR,
  INT,
  INT64,
  TEXT,
  ZEROBLOB,
  NIL = 0x7F
};

typedef struct js_datavalue {
  char type;
  int length;
  void* value;
} js_datavalue;

static js_vtab* cursor_tab(js_vtab_cursor* c) {
  return (js_vtab*) c->base.pVtab;
};

// create a virtual table
static int js_xCreate(sqlite3 *db, void *pAux, int argc, char **argv, sqlite3_vtab **ppVTab, char **pzErr) {
  if (argc < 3) {
    *pzErr = sqlite3_mprintf("No table name provided.");
    return SQLITE_ERROR;
  }
  
  // Allocate the table.
  js_vtab* table = sqlite3_malloc(sizeof(js_vtab));
  if (table == 0) {
    *pzErr = sqlite3_mprintf("Failed to allocate table.");
    return SQLITE_NOMEM;
  }
  *ppVTab = &table->base;
  table->db = db;

  int len = strlen(argv[2]);
  table->name = sqlite3_malloc(len);
  memcpy(table->name, argv[2], len);

  // Launchpad to Javascript.  js_backing must call js_done to yield control.
  if (! setjmp(buf)) {
    js_backing(table->name, -1);
  }
  char* create_stmt = (char*)js_answer;

  // Declare the table to the database.
  if(sqlite3_declare_vtab(db, create_stmt) != SQLITE_OK) {
    *pzErr = sqlite3_mprintf("Failed to declare table.");
    sqlite3_free(table->name);
    sqlite3_free(table);
    return SQLITE_ERROR;
  }
  return SQLITE_OK;
};

// Release a table.
static int js_xDisconnect(sqlite3_vtab *pVTab) {
  js_vtab* tab = (js_vtab*) pVTab;
  sqlite3_free(tab->name);
  sqlite3_free(tab);
  return SQLITE_OK;
};

// Define good table access patterns.
static int js_xBestIndex(sqlite3_vtab *pVTab, sqlite3_index_info* info) {
  js_vtab* tab = (js_vtab*) pVTab;
  // Tasks:
  // 1. determine the estimatedCost for a given index_info.
  // 2. If ordering requested can be delivered, set the orderByConsumed bit.
  // 3. Save the description of what needs to happen to help xFilter's life.
  return SQLITE_OK;
};

// Create a cursor.
static int js_xOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor) {
  js_vtab* tab = (js_vtab*) pVTab;
  js_vtab_cursor* c = sqlite3_malloc(sizeof(js_vtab_cursor));
  if (c) {
    memset(c, 0, sizeof(js_vtab_cursor));
    *ppCursor = &c->base;
    return SQLITE_OK;
  } else {
    return SQLITE_NOMEM;
  }
};

// Filter a cursor.
static int js_xFilter(sqlite3_vtab_cursor *pCursor, int idxNum, const char *idxStr, int argc, sqlite3_value **argv) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    js_vtab* tab = cursor_tab(c);
    c->rowid = 0;

    return SQLITE_OK;
};

// Close a cursor.
static int js_xClose(sqlite3_vtab_cursor *pCursor) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    sqlite3_free(c);
    return SQLITE_OK;
};

// Iterate a cursor.
static int js_xNext(sqlite3_vtab_cursor *pCursor) {
    int i = 0;
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    js_vtab* tab = cursor_tab(c);
    if (c->row != 0) {
      while (c->row[i] != 0) {
        free(c->row[i]);
        i++;
      }
      free(c->row);
    }

    // Launchpad to Javascript.  js_backing must call js_done to yield control.
    if (! setjmp(buf)) {
        js_backing(tab->name, c->rowid++);
    }
    c->row = (void**)js_answer;
    if (c->row == 0) {
      c->eof = 1;
    }
    return SQLITE_OK;
};

// End of cursor check.
static int js_xEof(sqlite3_vtab_cursor *pCursor) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    return c->eof;
};

// Get some data.
static int js_xColumn(sqlite3_vtab_cursor *pCursor, sqlite3_context *pContext, int idxCol) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    struct js_datavalue* value = (struct js_datavalue*)c->row[idxCol];
    void* sql_owned_data;
    switch(value->type) {
        case BLOB:
            sql_owned_data = sqlite3_malloc(value->length);
            if (sql_owned_data != 0) {
                memcpy(sql_owned_data, value->value, value->length);
                sqlite3_result_blob(pContext, sql_owned_data, value->length, sqlite3_free);
            } else {
                sqlite3_result_error_nomem(pContext);
            }
            break;
        case DOUBLE:
            sqlite3_result_double(pContext, *(double*)value->value);
            break;
        case ERROR:
            sqlite3_result_error(pContext, (char*)value->value, value->length);
            break;
        case INT:
            sqlite3_result_int(pContext, *(int*)value->value);
            break;
        case INT64:
            sqlite3_result_int64(pContext, *(sqlite3_int64*)value->value);
            break;
        case TEXT:
            sql_owned_data = (char*)sqlite3_malloc(value->length);
            if (sql_owned_data != 0) {
                memcpy(sql_owned_data, value->value, value->length);
                sqlite3_result_text(pContext, sql_owned_data, value->length, sqlite3_free);
            } else {
                sqlite3_result_error_nomem(pContext);
            }
            break;
        case ZEROBLOB:
            sqlite3_result_zeroblob(pContext, value->length);
            break;
        case NIL:
        default:
            sqlite3_result_null(pContext);
    }
    return SQLITE_OK;
};

// Get cursor row id.
static int js_xRowid(sqlite3_vtab_cursor *pCursor, sqlite_int64 *pRowid) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    *pRowid = c->rowid;
    return SQLITE_OK;
};

// Rename.
static int js_rename(sqlite3_vtab *pVTab, const char *zName) {
  return SQLITE_OK;
};

static int jsbacked_create_module(sqlite3 *db, char **pzErrMsg, const sqlite3_api_routines *pApi) {
  SQLITE_EXTENSION_INIT2(pApi);

  js_module.iVersion        = js_version;
  js_module.xCreate         = js_xCreate;
  js_module.xConnect        = js_xCreate;
  js_module.xBestIndex      = js_xBestIndex;
  js_module.xDisconnect     = js_xDisconnect;
  js_module.xDestroy        = js_xDisconnect;
  js_module.xOpen           = js_xOpen;
  js_module.xClose          = js_xClose;
  js_module.xFilter         = js_xFilter;
  js_module.xNext           = js_xNext;
  js_module.xEof            = js_xEof;
  js_module.xColumn         = js_xColumn;
  js_module.xRowid          = js_xRowid;
  js_module.xUpdate         = 0;
  js_module.xBegin          = 0;
  js_module.xSync           = 0;
  js_module.xCommit         = 0;
  js_module.xRollback       = 0;
  js_module.xFindFunction   = 0; //TODO: this could be smarter.
  js_module.Rename          = js_rename;
  js_module.xSavepoint      = 0;
  js_module.xRelease        = 0;
  js_module.xRollbackTo     = 0;

  *pzErrMsg = NULL;
  sqlite3_create_module(
    db,
    "jsbacked",
    &js_module,
    0);
  return SQLITE_OK;
};

// Exported Functions.
static void jsbacked_init(void(*callback)(char*,int)) {
  js_backing = callback;
  sqlite3_auto_extension(jsbacked_create_module);
};

static void jsbacked_done(void* answer) {
  js_answer = answer;
  longjmp(buf, 1);
};