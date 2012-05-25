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
  const int MAX_DATA_SIZE = 2048;
  char readBuf[MAX_DATA_SIZE];
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

  int32_t socketId, ssocketId;
  std::string host;
  uint16_t port;
  int32_t numBytes;
  std::string data;
  const uint8_t localhost[4] = {0, 0, 0, 0};
  int32_t backlog = 5;
  struct PP_NetAddress_Private address;
  int32_t ret;

  switch (command) {
    case WEBP2P_CREATESOCKET:
      this->NewSocketCallback(PP_OK, id, false, &ret);
      break;
    case WEBP2P_CONNECT:
      socketId = atoi(this->JsonGet(message, "\"socketId\"").c_str());
      if (sockets_.count(socketId) > 0) {
        host = this->JsonGet(message, "\"host\"");
        host = host.substr(1, host.size()-2); //trim quotes
        port = atoi(this->JsonGet(message, "\"port\"").c_str());
        sockets_[socketId]->Connect(host.c_str(), port, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      } else {
        this->Callback(PP_ERROR_BADRESOURCE, id, &ret);
      }
      break;
    case WEBP2P_READ:
      socketId = atoi(this->JsonGet(message, "\"socketId\"").c_str());
      numBytes = atoi(this->JsonGet(message, "\"numBytes\"").c_str());
      sockets_[socketId]->Read(readBuf,numBytes,factory_.NewCallback(&NaclTransportInstance::ReadCallback, id, numBytes, &ret));
      break;
    case WEBP2P_WRITE:
      socketId = atoi(this->JsonGet(message, "\"socketId\"").c_str());
      data = this->JsonGet(message, "\"data\"");
      data = data.substr(1, data.size()-2); //trim quotes
      sockets_[socketId]->Write(data.c_str(), data.size(), factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      break;
    case WEBP2P_DISCONNECT:
      socketId = atoi(this->JsonGet(message, "\"socketId\"").c_str());
      if (sockets_.count(socketId) > 0) {
        sockets_[socketId]->Disconnect();
        this->Callback(PP_OK, id, &ret);
      } else {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      }
      break;
    case WEBP2P_DESTROY:
      socketId = atoi(this->JsonGet(message, "\"socketId\"").c_str());
      sockets_.erase(socketId);
      socket_res_.erase(socketId);
      this->Callback(PP_OK, id, &ret);
      break;
    case WEBP2P_CREATESERVERSOCKET:
      this->NewServerSocketCallback(PP_OK, id, &ret);
      break;
    case WEBP2P_LISTEN:
      ssocketId = atoi(this->JsonGet(message, "\"ssocketId\"").c_str());
      port = atoi(this->JsonGet(message, "\"port\"").c_str());
      pp::NetAddressPrivate::CreateFromIPv4Address(localhost, port, &address);
      server_sockets_[ssocketId]->Listen(&address, backlog, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      break;
    case WEBP2P_ACCEPT:
      ssocketId = atoi(this->JsonGet(message, "\"ssocketId\"").c_str());
      socket_res_[id] = new PP_Resource();
      server_sockets_[ssocketId]->Accept(socket_res_[id], factory_.NewCallback(&NaclTransportInstance::NewSocketCallback, id, true, &ret));
      break;
    case WEBP2P_STOPLISTENING:
      ssocketId = atoi(this->JsonGet(message, "\"ssocketId\"").c_str());
      server_sockets_[ssocketId]->StopListening();
      this->Callback(PP_OK, id, &ret);
      break;
    case WEBP2P_DESTROYSERVERSOCKET:
      ssocketId = atoi(this->JsonGet(message, "\"ssocketId\"").c_str());
      server_sockets_.erase(ssocketId);
      this->Callback(PP_OK, id, &ret);
      break;
    default:
      this->Callback(PP_ERROR_FAILED, id, &ret); 
      break;
  }

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

void NaclTransportInstance::ReadCallback(int32_t result, int32_t id, int32_t numBytes, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id].c_str());
  readBuf[numBytes] = '\0'; //Just in case?
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":\"%s\",\"data\":\"%s\"}", reqs_[id].c_str(), ppErrorToString(result), readBuf);
  log_->log(retStr);
  reqs_.erase(id);
}

void NaclTransportInstance::NewServerSocketCallback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id].c_str());
  server_sockets_[id] = new pp::TCPServerSocketPrivate(this);
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":\"%s\",\"ssocketId\":%d}", reqs_[id].c_str(), ppErrorToString(result), id);
  log_->log(retStr);
  reqs_.erase(id);
}

void NaclTransportInstance::NewSocketCallback(int32_t result, int32_t id, bool from_res, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id].c_str());
  if (from_res) {
    sockets_[id] = new pp::TCPSocketPrivate(pp::PassRef(), *(socket_res_[id]));
  } else {
    sockets_[id] = new pp::TCPSocketPrivate(this);
  }
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":\"%s\",\"socketId\":%d}", reqs_[id].c_str(), ppErrorToString(result), id);
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


