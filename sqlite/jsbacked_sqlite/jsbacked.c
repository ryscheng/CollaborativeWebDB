#include "sqlite3ext.h"

#include <malloc.h>
#include <setjmp.h>
#include <string.h>

SQLITE_EXTENSION_INIT1

static int js_version = 1;
static void (*js_backing)(char*,int) = 0;
static void* js_answer = 0;
static jmp_buf buf;

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
  NIL = 0xff
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
    sqlite3_value *pVal;
    switch(value->type) {
        case BLOB:
            void *sql_owned_blob = sqlite3_malloc(value->length);
            if (sql_owned_blob != 0) {
                memcpy(sql_owned_blob, value->value, value->length);
                pVal = sqlite3_result_blob(pContext, sql_owned_blob, value->length, sqlite3_free);
            } else {
                pVal = sqlite3_result_error_nomem(pContext);
            }
            break;
        case DOUBLE:
            pVal = sqlite3_result_double(pContext, *(double*)value->value);
            break;
        case ERROR:
            pVal = sqlite3_result_error(pContext, (char*)value->value, value->length);
            break;
        case INT:
            pVal = sqlite3_result_int(pContext, *(int*)value->value);
            break;
        case INT64:
            pVal = sqlite3_result_int64(pContext, *(sqlite3_int64*)value->value);
            break;
        case TEXT:
            char *sql_owned_str = (char*)sqlite3_malloc(value->length);
            if (sql_owned_str != 0) {
                memcpy(sql_owned_str, value->value, value->length);
                pVal = sqlite3_result_text(pContext, sql_owned_str, value->length, sqlite3_free);
            } else {
                pVal = sqlite3_result_error_nomem(pContext);
            }
            break;
        case ZEROBLOB:
            pVal = sqlite3_result_zeroblob(pContext, value->length);
            break;
        case NIL:
        default:
            pVal = sqlite3_result_null(pContext);
    }
    sqlite3_result_value(pContext, pVal);
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


static sqlite3_module js_module = {
  js_version,       // iVersion
  js_xCreate,       // xCreate
  js_xCreate,       // xConnect
  js_xBestIndex,    // xBestIndex
  js_xDisconnect,   // xDisconnect
  js_xDisconnect,   // xDestroy
  js_xOpen,         // xOpen
  js_xClose,        // xClose
  js_xFilter,       // xFilter
  js_xNext,         // xNext
  js_xEof,          // xEof
  js_xColumn,       // xColumn
  js_xRowid,        // xRowid
  NULL,             // xUpdate
  NULL,             // xBegin
  NULL,             // xSync
  NULL,             // xCommit
  NULL,             // xRollback
  NULL,             // xFindFunction TODO: may want to implement
  js_rename,        // Rename
  NULL,             // xSavepoint
  NULL,             // xRelease
  NULL              // xRollbackTo
};

static int jsbacked_create_module(sqlite3 *db, char **pzErrMsg, const sqlite3_api_routines *pApi) {
  SQLITE_EXTENSION_INIT2(pApi);
  *pzErrMsg = NULL;
  sqlite3_create_module(
    db,
    "jsbacked",
    js_module,
    null);
  return SQLITE_OK;
};

// Exported Functions.
static void jsbacked_init(void(*callback)(char*,int)) {
  js_backing = callback;
  sqlite3_auto_extension(jsbacked_create_module)
};

static void jsbacked_done(void* answer) {
  js_answer = answer;
  longjmp(buf, 1);
};
