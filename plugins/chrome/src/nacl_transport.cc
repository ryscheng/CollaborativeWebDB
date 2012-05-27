/**
 * Module Entry point for NaCl Transport
 * @author ryscheng
 * @project WebP2P
 **/
#include <stdio.h>
#include <string.h>

#include "nacl_transport.h"
#include "pJSON/pJSON.h"

#define DEBUG true

namespace {
  const char* const kNotStr = "Received non-string message";
  const char* const kReplyStr = "HEWO BACK ATCHA";
  const int MAX_RESULT_SIZE = 1024;
  const int MAX_DATA_SIZE = 2048;
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
  std::string* message = new std::string(var_message.AsString());
  int32_t command = this->JsonGetNumber(message, "command");
  int32_t id = this->JsonGetNumber(message, "id");
  reqs_[id] = message;
#ifdef DEBUG
  fprintf(stdout,"id:%d:%s\n", id, message->c_str());
#endif

  int32_t socketId, ssocketId;
  std::string host;
  uint16_t port;
  int32_t numBytes;
  std::string* data;
  std::string datamsg;
  const uint8_t localhost[4] = {0, 0, 0, 0};
  int32_t backlog = 5;
  struct PP_NetAddress_Private address;
  int32_t ret;

  switch (command) {
    case WEBP2P_CREATESOCKET:
      this->NewSocketCallback(PP_OK, id, false, &ret);
      break;
    case WEBP2P_CONNECT:
      socketId = this->JsonGetNumber(message, "socketId");
      if (sockets_.count(socketId) > 0) {
        host = this->JsonGetString(message, "host");
        port = this->JsonGetNumber(message, "port");
        
        fprintf(stdout,"will attempt to connect to %s on port %d\n",host.c_str(),port);

        sockets_[socketId]->Connect(host.c_str(), port, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      } else {
        this->Callback(PP_ERROR_BADRESOURCE, id, &ret);
      }
      break;
    case WEBP2P_READ:
      socketId = this->JsonGetNumber(message, "socketId");
      numBytes = this->JsonGetNumber(message, "numBytes");
      data = new std::string(0x00, numBytes);
      ios_[id] = data;
#ifdef DEBUG
      fprintf(stdout,"read allocated cstring of length %d\n",numBytes);
#endif
      sockets_[socketId]->Read(const_cast<char*>(data->c_str()),numBytes,factory_.NewCallback(&NaclTransportInstance::ReadCallback, id, numBytes, &ret));
      break;
    case WEBP2P_WRITE:
      socketId = this->JsonGetNumber(message, "socketId");
      datamsg = this->JsonGetString(message, "data");
      data = new std::string(datamsg);
#ifdef DEBUG
      fprintf(stdout, "datamessage is (%d): %s\n", datamsg.size(), datamsg.c_str());
      fprintf(stdout, "write of string(%d): %s\n", data->size(), data->c_str());
#endif
      ios_[id] = data;
      sockets_[socketId]->Write(data->c_str(), data->size(), factory_.NewCallback(&NaclTransportInstance::WriteCallback, id, &ret));
      break;
    case WEBP2P_DISCONNECT:
      socketId = this->JsonGetNumber(message, "socketId");
      if (sockets_.count(socketId) > 0) {
        sockets_[socketId]->Disconnect();
        this->Callback(PP_OK, id, &ret);
      } else {
        this->Callback(PP_ERROR_BADARGUMENT, id, &ret);
      }
      break;
    case WEBP2P_DESTROY:
      socketId = this->JsonGetNumber(message, "socketId");
      sockets_.erase(socketId);
      socket_res_.erase(socketId);
      this->Callback(PP_OK, id, &ret);
      break;
    case WEBP2P_CREATESERVERSOCKET:
      this->NewServerSocketCallback(PP_OK, id, &ret);
      break;
    case WEBP2P_LISTEN:
      ssocketId = this->JsonGetNumber(message, "ssocketId");
      port = this->JsonGetNumber(message, "port");
      pp::NetAddressPrivate::CreateFromIPv4Address(localhost, port, &address);
      server_sockets_[ssocketId]->Listen(&address, backlog, factory_.NewCallback(&NaclTransportInstance::Callback, id, &ret));
      break;
    case WEBP2P_ACCEPT:
      ssocketId = this->JsonGetNumber(message, "ssocketId");
      socket_res_[id] = new PP_Resource();
      server_sockets_[ssocketId]->Accept(socket_res_[id], factory_.NewCallback(&NaclTransportInstance::NewSocketCallback, id, true, &ret));
      break;
    case WEBP2P_STOPLISTENING:
      ssocketId = this->JsonGetNumber(message, "ssocketId");
      server_sockets_[ssocketId]->StopListening();
      this->Callback(PP_OK, id, &ret);
      break;
    case WEBP2P_DESTROYSERVERSOCKET:
      ssocketId = this->JsonGetNumber(message, "ssocketId");
      server_sockets_[ssocketId]->StopListening();
      server_sockets_.erase(ssocketId);
      this->Callback(PP_OK, id, &ret);
      break;
    default:
      this->Callback(PP_ERROR_FAILED, id, &ret); 
      break;
  }

}

std::string NaclTransportInstance::JsonGetString(std::string* json, std::string key){
  pJSON::Value parsed = pJSON::Value::parse(*json);
  pJSON::Value object = parsed[key];
  if (!object.isString()) {
    return "";
  }
  return object.asString();
}

double NaclTransportInstance::JsonGetNumber(std::string* json, std::string key){
  pJSON::Value parsed = pJSON::Value::parse(*json);
  pJSON::Value object = parsed[key];
  if (!object.isNumber()) {
    return -1;
  }
  return object.asNumber();
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

void NaclTransportInstance::ReadCallback(int32_t result, int32_t id, int32_t numBytes, int32_t* pres){
  char retStr[MAX_RESULT_SIZE];
#ifdef DEBUG
  fprintf(stdout, "readcallback:%d:%s\n", id, reqs_[id]->c_str());
  fprintf(stdout, "readbuffer:%s\n",ios_[id]->c_str());
#endif
  snprintf(retStr, MAX_RESULT_SIZE, "{\"request\":%s,\"result\":%d,\"resultStr\":\"%s\",\"data\":\"%s\"}", reqs_[id]->c_str(), result, ppErrorToString(result), ios_[id]->c_str());
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


