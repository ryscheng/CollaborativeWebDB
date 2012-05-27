/**
 * Module Entry point for NaCl Transport
 * @author ryscheng
 * @project WebP2P
 **/
#include <stdio.h>
#include "nacl_transport.h"
#include "pJSON/pJSON.h"

#define DEBUG true

namespace {
  const char* const kNotStr = "Error: Received non-string message";
  const char* const kBadCommand = "Error: Received bad 'command' value";
  const char* const kBadId = "Error: Received bad 'id' value";
  const int MAX_RESULT_SIZE = 1024;
  std::string* EMPTY_STR = new std::string();
}

std::string NaclTransportInstance::JsonGetString(std::string* json, std::string key) {
  pJSON::Value parsed = pJSON::Value::parse(*json);
  if (!parsed.hasKey(key)) {
    return *EMPTY_STR;
  }
  pJSON::Value object = parsed[key];
  if (!object.isString()) {
    return *EMPTY_STR;
  }
  return object.asString();
}

int32_t NaclTransportInstance::JsonGetNumber(std::string* json, std::string key) {
  pJSON::Value parsed = pJSON::Value::parse(*json);
  if (!parsed.hasKey(key)) {
    return -1;
  }
  pJSON::Value object = parsed[key];
  if (!object.isNumber()) {
    return -1;
  }
  return object.asNumber();
}

// Handler for messages coming in from the browser via postMessage().  
// @param[in] var_message The message posted by the browser.
void NaclTransportInstance::HandleMessage(const pp::Var& var_message) {
  std::string* message;
  int32_t command, id, socketId, ssocketId, ret;
  if (!var_message.is_string()) {
    log_->log(kNotStr);
    return;
  }
  message = new std::string(var_message.AsString());
  if ((command=this->JsonGetNumber(message, "command")) == -1) {
    log_->log(kBadCommand);
    delete message;
    return;
  }
  if ((id=this->JsonGetNumber(message, "id")) == -1) {
    log_->log(kBadId);
    delete message;
    return;
  }
  reqs_[id] = message;
#ifdef DEBUG
  fprintf(stdout,"id:%d:%s\n", id, message->c_str());
#endif

  switch (command) {
    case WEBP2P_CREATESOCKET:
      this->NewSocketCallback(PP_OK, id, false, &ret);
      break;
    case WEBP2P_CONNECT:
      this->Connect(message, id);
      break;
    case WEBP2P_READ:
      this->Read(message, id);
      break;
    case WEBP2P_WRITE:
      this->Write(message, id);
      break;
    case WEBP2P_DISCONNECT:
      if(((socketId=this->JsonGetNumber(message, "socketId")) == -1) || 
          (sockets_.count(socketId) <= 0)) {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      } else {
        sockets_[socketId]->Disconnect();
        this->Callback(PP_OK, id, &ret);
      }
      break;
    case WEBP2P_DESTROY:
      if ((socketId=this->JsonGetNumber(message, "socketId")) == -1){
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      } else {
        sockets_.erase(socketId);
        socket_res_.erase(socketId);
        this->Callback(PP_OK, id, &ret);
      }
      break;
    case WEBP2P_CREATESERVERSOCKET:
      this->NewServerSocketCallback(PP_OK, id, &ret);
      break;
    case WEBP2P_LISTEN:
      this->Listen(message, id);
      break;
    case WEBP2P_ACCEPT:
      if (((ssocketId=this->JsonGetNumber(message, "ssocketId")) == -1) ||
          (server_sockets_.count(ssocketId) <= 0)) {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      } else {
        socket_res_[id] = new PP_Resource();
        server_sockets_[ssocketId]->Accept(socket_res_[id], factory_.NewCallback(&NaclTransportInstance::NewSocketCallback, id, true, &ret));
      }
      break;
    case WEBP2P_STOPLISTENING:
      if (((ssocketId=this->JsonGetNumber(message, "ssocketId")) == -1) ||
          (server_sockets_.count(ssocketId) <= 0)) {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      } else {
        server_sockets_[ssocketId]->StopListening();
        this->Callback(PP_OK, id, &ret);
      }
      break;
    case WEBP2P_DESTROYSERVERSOCKET:
      if (((ssocketId=this->JsonGetNumber(message, "ssocketId")) == -1) ||
          (server_sockets_.count(ssocketId) <= 0)) {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      } else {
        server_sockets_[ssocketId]->StopListening();
        server_sockets_.erase(ssocketId);
        this->Callback(PP_OK, id, &ret);
      }
      break;
    default:
      this->Callback(PP_ERROR_FAILED, id, &ret); 
      break;
  }

}

void NaclTransportInstance::Connect(std::string* message, int32_t id) {
  int32_t ret, socketId;
  std::string host;
  uint16_t port;
  if(((socketId=this->JsonGetNumber(message, "socketId")) == -1) || 
      (sockets_.count(socketId) <= 0) ||
      ((host=this->JsonGetString(message, "host")).empty()) ||
      ((port = this->JsonGetNumber(message, "port")) == -1)) {
    this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
    return;
  }
#ifdef DEBUG
  fprintf(stdout,"will attempt to connect to %s on port %d\n",host.c_str(),port);
#endif
  sockets_[socketId]->Connect(host.c_str(), port, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
}

void NaclTransportInstance::Read(std::string* message, int32_t id) {
  int32_t ret, socketId, numBytes;
  if(((socketId=this->JsonGetNumber(message, "socketId")) == -1) ||
      (sockets_.count(socketId) <= 0) ||
      ((numBytes=this->JsonGetNumber(message, "numBytes")) == -1)) {
    this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
    return;
  }
  std::string* data = new std::string(0x00, numBytes + 1);
  ios_[id] = data;
#ifdef DEBUG
  fprintf(stdout,"read allocated cstring of length %d\n",numBytes);
#endif
  sockets_[socketId]->Read(const_cast<char*>(data->c_str()),numBytes,factory_.NewCallback(&NaclTransportInstance::ReadCallback, id, numBytes, &ret));
}

void NaclTransportInstance::Write(std::string* message, int32_t id) {
  int32_t ret, socketId;
  std::string datamsg;
  if(((socketId=this->JsonGetNumber(message, "socketId")) == -1) ||
      (sockets_.count(socketId) <= 0) ||
      ((datamsg=this->JsonGetString(message, "data")).empty())) {
    this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
    return;
  }
  std::string* data = new std::string(datamsg);
#ifdef DEBUG
  fprintf(stdout, "datamessage is (%d): %s\n", datamsg.size(), datamsg.c_str());
  fprintf(stdout, "write of string(%d): %s\n", data->size(), data->c_str());
#endif
  ios_[id] = data;
  sockets_[socketId]->Write(data->c_str(), data->size(), factory_.NewCallback(&NaclTransportInstance::WriteCallback, id, &ret));
}

void NaclTransportInstance::Listen(std::string* message, int32_t id) {
  int32_t ret, ssocketId, port;
  const uint8_t localhost[4] = {0, 0, 0, 0};
  int32_t backlog = 5;
  struct PP_NetAddress_Private address;
  if(((ssocketId=this->JsonGetNumber(message, "ssocketId")) == -1) ||
      (server_sockets_.count(ssocketId) <= 0) ||
      ((port=this->JsonGetNumber(message, "port")) == -1)) {
    this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
    return;
  }
  pp::NetAddressPrivate::CreateFromIPv4Address(localhost, port, &address);
  server_sockets_[ssocketId]->Listen(&address, backlog, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
}

void NaclTransportInstance::Callback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id]->c_str());
#endif
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\"}", reqs_[id]->c_str(), result, ppErrorToString(result));
  log_->log(retStr);
  delete reqs_[id];
  reqs_.erase(id);
}

void NaclTransportInstance::ReadCallback(int32_t result, int32_t id, int32_t numBytes, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "readcallback:%d:%s\n", id, reqs_[id]->c_str());
  fprintf(stdout, "readbuffer:%s\n",ios_[id]->c_str());
#endif
  char* read_buf = const_cast<char*>(ios_[id]->c_str());
  read_buf[numBytes] = '\0';
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\",\"data\":\"%s\"}", reqs_[id]->c_str(), result, ppErrorToString(result), read_buf);
  delete ios_[id];
  ios_.erase(id);
  delete reqs_[id];
  reqs_.erase(id);
  log_->log(retStr);
}

void NaclTransportInstance::WriteCallback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "writecallback:%d:%s\n", id, reqs_[id]->c_str());
  fprintf(stdout, "writebuffer:%s\n",ios_[id]->c_str());
#endif
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\"}", reqs_[id]->c_str(), result, ppErrorToString(result));
  delete ios_[id];
  ios_.erase(id);
  delete reqs_[id];
  reqs_.erase(id);
  log_->log(retStr);
}

void NaclTransportInstance::NewServerSocketCallback(int32_t result, int32_t id, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id]->c_str());
#endif
  server_sockets_[id] = new pp::TCPServerSocketPrivate(this);
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\",\"ssocketId\":%d}", reqs_[id]->c_str(), result, ppErrorToString(result), id);
  delete reqs_[id];
  reqs_.erase(id);
  log_->log(retStr);
}

void NaclTransportInstance::NewSocketCallback(int32_t result, int32_t id, bool from_res, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "callback:%d:%s\n", id, reqs_[id]->c_str());
#endif
  if (from_res) {
    sockets_[id] = new pp::TCPSocketPrivate(pp::PassRef(), *(socket_res_[id]));
  } else {
    sockets_[id] = new pp::TCPSocketPrivate(this);
  }
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\",\"socketId\":%d}", reqs_[id]->c_str(), result, ppErrorToString(result), id);
  delete reqs_[id];
  reqs_.erase(id);
  log_->log(retStr);
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


