/**
 * Module Entry point for NaCl Transport
 * @author ryscheng
 * @project WebP2P
 **/
#include <stdio.h>
#include <string.h>

#include "nacl_transport.h"

namespace {
  const char* const kNotStr = "Received non-string message";
  const char* const kReplyStr = "HEWO BACK ATCHA";
  const int MAX_RESULT_SIZE = 1024;
}

/// Handler for messages coming in from the browser via postMessage().  The
/// @a var_message can contain anything: a JSON string; a string that encodes
/// method names and arguments; etc.  For example, you could use
/// JSON.stringify in the browser to create a message that contains a method
/// name and some parameters, something like this:
///   var json_message = JSON.stringify({ "myMethod" : "3.14159" });
///   nacl_module.postMessage(json_message);
/// On receipt of this message in @a var_message, you could parse the JSON to
/// retrieve the method name, match it to a function call, and then call it
/// with the parameter.
/// @param[in] var_message The message posted by the browser.
void NaclTransportInstance::HandleMessage(const pp::Var& var_message) {
  // TODO(sdk_user): 1. Make this function handle the incoming message.
  if (!var_message.is_string()) {
    log_->log(kNotStr);
    return;
  }
  std::string message = var_message.AsString();
  int32_t command = atoi(this->JsonGet(message, "\"command\"").c_str());
  int32_t id = atoi(this->JsonGet(message, "\"id\"").c_str());
  reqs_[id] = message;
  fprintf(stdout,"id:%d:%s\n", id, message.c_str());

  uint16_t port;
  const uint8_t localhost[4] = {0, 0, 0, 0};
  int32_t backlog = 5;
  struct PP_NetAddress_Private address;
  int32_t ret;

  switch (command) {
    case WEBP2P_CREATESERVERSOCKET:
      if (!server_socket_) {
        server_socket_ = new pp::TCPServerSocketPrivate(this);
      }
      this->Callback(0, id, &ret);
      break;
    case WEBP2P_LISTEN:
      port = atoi(this->JsonGet(message, "\"port\"").c_str());
      pp::NetAddressPrivate::CreateFromIPv4Address(localhost, port, &address);
      server_socket_->Listen(&address, backlog, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      break;
    case WEBP2P_ACCEPT:
      socket_res_[id] = new PP_Resource();
      server_socket_->Accept(socket_res_[id], factory_.NewCallback(&NaclTransportInstance::AcceptCallback, id, &ret));
      break;
    case WEBP2P_STOPLISTENING:
      if (server_socket_) {
        server_socket_->StopListening();
        delete server_socket_;
        server_socket_ = NULL;
      }
      this->Callback(0, id, &ret);
      break;
    default:
      break;
  }
  //while (id != -1) {}
  //TcpSocket* sock = new TcpSocket(this);
  //sockets_.push_back(sock);
  //log_->log(sockets_.size());
  //sock->connect("127.0.0.1", 80);
  //sock->close();
  //delete sock;

}

std::string NaclTransportInstance::JsonGet(std::string json, std::string key){
  size_t front = json.find(key.c_str());
  size_t back = json.find_first_of(',', front);
  front = json.find_first_of(':', front)+1;
  return json.substr(front, back-front);
}

void NaclTransportInstance::Callback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id].c_str());
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":\"%s\"}", reqs_[id].c_str(), ppErrorToString(result));
  log_->log(retStr);
  reqs_.erase(id);
}

void NaclTransportInstance::AcceptCallback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id].c_str());
  sockets_[id] = new pp::TCPSocketPrivate(pp::PassRef(), *(socket_res_[id]));
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":\"%s\",\"socketId\":\"%d\"}", reqs_[id].c_str(), ppErrorToString(result), id);
  log_->log(retStr);
  reqs_.erase(id);
}



//---------------------------------------------------------------------------------
class NaclTransportModule : public pp::Module {
  public:
    NaclTransportModule() : pp::Module() {}
    virtual ~NaclTransportModule() {}
    virtual pp::Instance* CreateInstance(PP_Instance instance) {
      return new NaclTransportInstance(instance);
    }
};

namespace pp {
  Module* CreateModule() {
    return new NaclTransportModule();
  }
}


