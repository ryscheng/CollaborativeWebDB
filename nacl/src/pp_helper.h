#ifndef PP_HELPER_H
#define PP_HELPER_H

#include "ppapi/c/pp_errors.h"

//Based on <NaClSDK>/pepper_19/toolchain/linux_x86_newlib/x86_64-nacl/include/ppapi/c/pp_errors.h

char const* pperrorstr(int32_t errornum) {
  switch(errornum) {
    case PP_OK:
      return "PP_OK";
    case PP_OK_COMPLETIONPENDING:
      return "PP_OK_COMPLETIONPENDING";
    case PP_ERROR_FAILED:
      return "PP_ERROR_FAILED";
    case PP_ERROR_ABORTED:
      return "PP_ERROR_ABORTED";
    case PP_ERROR_BADARGUMENT:
      return "PP_ERROR_BADARGUMENT";
    case PP_ERROR_BADRESOURCE:
      return "PP_ERROR_BADRESOURCE";
    case PP_ERROR_NOINTERFACE:
      return "PP_ERROR_NOINTERFACE";
    case PP_ERROR_NOACCESS:
      return "PP_ERROR_NOACCESS";
    case PP_ERROR_NOMEMORY:
      return "PP_ERROR_NOMEMORY";
    case PP_ERROR_NOSPACE:
      return "PP_ERROR_NOSPACE";
    case PP_ERROR_NOQUOTA:
      return "PP_ERROR_NOQUOTA";
    case PP_ERROR_INPROGRESS:
      return "PP_ERROR_INPROGRESS";
    case PP_ERROR_NOTSUPPORTED:
      return "PP_ERROR_NOSUPPORTED";
    case PP_ERROR_BLOCKS_MAIN_THREAD:
      return "PP_ERROR_BLOCKS_MAIN_THREAD";
    case PP_ERROR_FILENOTFOUND:
      return "PP_ERROR_FILENOTFOUND";
    case PP_ERROR_FILEEXISTS:
      return "PP_ERROR_FILEEXISTS";
    case PP_ERROR_FILETOOBIG:
      return "PP_ERROR_FILETOOBIG";
    case PP_ERROR_FILECHANGED:
      return "PP_ERROR_FILECHANGED";
    case PP_ERROR_TIMEDOUT:
      return "PP_ERROR_TIMEDOUT";
    case PP_ERROR_USERCANCEL:
      return "PP_ERROR_USERCANCEL";
    case PP_ERROR_NO_USER_GESTURE:
      return "PP_ERROR_NO_USER_GESTURE";
    case PP_ERROR_CONTEXT_LOST:
      return "PP_ERROR_CONTEXT_LOST";
    case PP_ERROR_NO_MESSAGE_LOOP:
      return "PP_ERROR_NO_MESSAGE_LOOP";
    case PP_ERROR_WRONG_THREAD:
      return "PP_ERROR_WRONG_THREAD";
    default:
      return "ERROR MESSAGE NOT FOUND";
  }
}

#endif
