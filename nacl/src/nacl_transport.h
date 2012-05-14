#ifndef NACL_TRANSPORT_H
#define NACL_TRANSPORT_H

#include <vector>

#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include "ppapi/cpp/completion_callback.h"
#include "ppapi/utility/completion_callback_factory.h"
#include "ppapi/cpp/private/tcp_socket_private.h"

#include "logger.h"
#include "pthread_helpers.h"

class NaclTransportInstance : public pp::Instance {
  public:
    explicit NaclTransportInstance(PP_Instance instance) : pp::Instance(instance), factory_(this){
      log_ = new Logger(this);
    }
    virtual ~NaclTransportInstance(){}

    virtual void HandleMessage(const pp::Var& var_message);
  private:
    Logger* log_;
    pp::CompletionCallbackFactory<NaclTransportInstance, ThreadSafeRefCount> factory_;
    std::vector<pp::TCPSocketPrivate*> sockets_;
};

#endif
