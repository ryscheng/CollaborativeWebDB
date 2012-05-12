#ifndef NACL_TRANSPORT_H
#define NACL_TRANSPORT_H

#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"

class NaclTransportInstance : public pp::Instance {
  public:
    explicit NaclTransportInstance(PP_Instance instance) : pp::Instance(instance){}
    virtual ~NaclTransportInstance(){}

    virtual void HandleMessage(const pp::Var& var_message);
    void log(char const* msg);
  private:
};

#endif
