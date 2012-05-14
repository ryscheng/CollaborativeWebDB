#ifndef LOGGER_H
#define LOGGER_H

#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"

class Logger {
  public:
    Logger(pp::Instance* in);
    virtual ~Logger();
    
    void log(char const* msg);
    void log(int32_t msg);
  private:
    pp::Instance* instance_;
};

#endif
