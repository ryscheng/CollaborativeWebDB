#ifndef NACL_TRANSPORT_H
#define NACL_TRANSPORT_H

#include <vector>
#include <map>

#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include "ppapi/cpp/completion_callback.h"
#include "ppapi/utility/completion_callback_factory.h"
#include "ppapi/cpp/private/tcp_socket_private.h"
#include "ppapi/cpp/private/tcp_server_socket_private.h"
#include "ppapi/cpp/private/net_address_private.h"
#include "ppapi/c/private/ppb_net_address_private.h"

#include "logger.h"
#include "pthread_helpers.h"
#include "pp_helper.h"

//This order must correspond with js/common.js
enum COMMANDS {
  WEBP2P_CREATESOCKET=0,
  WEBP2P_CONNECT,
  WEBP2P_READ,
  WEBP2P_WRITE,
  WEBP2P_DISCONNECT,
  WEBP2P_DESTROY,
  WEBP2P_GETPUBLICIP,
  WEBP2P_CREATESERVERSOCKET,
  WEBP2P_LISTEN, 
  WEBP2P_ACCEPT,
  WEBP2P_STOPLISTENING,
  WEBP2P_DESTROYSERVERSOCKET
};

class NaclTransportInstance : public pp::Instance {
  public:
    explicit NaclTransportInstance(PP_Instance instance) : pp::Instance(instance), factory_(this){
      log_ = new Logger(this);
    }
    virtual ~NaclTransportInstance(){
      delete log_;
      reqs_.clear();
      socket_res_.clear();
      sockets_.clear();
      server_sockets_.clear();
    }

    virtual void HandleMessage(const pp::Var& var_message);
    void Callback(int32_t result, int32_t id, int32_t* pres);
    void NewServerSocketCallback(int32_t result, int32_t id, int32_t* pres);
    void NewSocketCallback(int32_t result, int32_t id, bool from_res, int32_t* pres);
    void ReadCallback(int32_t result, int32_t id, int32_t numBytes, int32_t* pres);
  private:
    Logger* log_;
    pp::CompletionCallbackFactory<NaclTransportInstance, ThreadSafeRefCount> factory_;
    std::map<int32_t, std::string> reqs_;
    std::map<int32_t, pp::TCPServerSocketPrivate*> server_sockets_;
    std::map<int32_t, PP_Resource*> socket_res_;
    std::map<int32_t, pp::TCPSocketPrivate*> sockets_;

    std::string JsonGet(std::string json, std::string key);

};

#endif
