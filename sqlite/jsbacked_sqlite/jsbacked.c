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
static int js_returns = 0;

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
  int type;
  int length;
  void* value;
} js_datavalue;

static js_vtab* cursor_tab(js_vtab_cursor* c) {
  return (js_vtab*) c->base.pVtab;
};

static int jsbacked_call(char* name, int idx) {
  if (! setjmp(buf)) {
    js_backing(name, idx);
  } else {
    // Longjump back.
    js_returns++;
  }

  if (js_returns > 0) {
    js_returns--;
    return SQLITE_OK;
  }
  // Otherwise, this is an unrolling of stack which we can ignore.
  return -1;
};

// create a virtual table
static int js_xCreate(sqlite3 *db, void *pAux, int argc, const char *const *argv, sqlite3_vtab **ppVTab, char **pzErr) {
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
  table->name = sqlite3_malloc(len + 1);
  memcpy(table->name, argv[2], len);
  table->name[len] = 0;

  // Launchpad to Javascript.  js_backing must call js_done to yield control.
  jsbacked_call(table->name, -1);
  char* create_stmt = (char*)js_answer;

  // Declare the table to the database.
  if(sqlite3_declare_vtab(db, create_stmt) != SQLITE_OK) {
    *pzErr = sqlite3_mprintf("Failed to declare virtual table from [%s].", create_stmt);
    sqlite3_free(table->name);
    sqlite3_free(table);
    free(js_answer);
    return SQLITE_ERROR;
  }
  free(js_answer);

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

  // are there rowid constraints?
  int nc = info->nConstraint;
  //sqlite3_index_constraint *constraints = info->aConstraint;
  //int i;


  //char* msg = sqlite3_malloc(256);
 /* 
  for (i=0; i<nc; i++) {
    sqlite3_index_constraint c = constraints[i];
  }

  */
  if (nc == -1) {
    char *error = sqlite3_mprintf("%d constraints", nc);
    pvTab->zErrMsg = error;
    return SQLITE_ERROR;
  }

  js_vtab* tab = (js_vtab*) pVTab;
  pVTab->zErrMsg = 0;
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
        free(((struct js_datavalue*)c->row[i])->value);
        free(c->row[i]);
        i++;
      }
      free(c->row);
    }

    // Launchpad to Javascript.  js_backing must call js_done to yield control.
    jsbacked_call(tab->name, c->rowid++);
    c->row = (void**)js_answer;
    if (c->row == 0) {
      c->eof = 1;
    } else {
      c->eof = 0;
    }
    return SQLITE_OK;
};

// Filter a cursor.
static int js_xFilter(sqlite3_vtab_cursor *pCursor, int idxNum, const char *idxStr, int argc, sqlite3_value **argv) {
    js_vtab_cursor *c = (js_vtab_cursor*) pCursor;
    js_vtab* tab = cursor_tab(c);
    c->rowid = 0;

    return js_xNext(pCursor);
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
static int js_xRename(sqlite3_vtab *pVTab, const char *zName) {
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
  js_module.xRename         = js_xRename;
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
static __attribute__((used)) int jsbacked_init(void(*callback)(char*,int)) {
  js_backing = callback;
  sqlite3_auto_extension(jsbacked_create_module);
  return SQLITE_OK;
};

static __attribute__((used)) int jsbacked_done(void* answer, int sync_flow) {
  js_answer = answer;
  if (!sync_flow) {
    longjmp(buf, 1);
    return SQLITE_ERROR;
  } else {
    js_returns++;
    return SQLITE_OK;
  }
};
