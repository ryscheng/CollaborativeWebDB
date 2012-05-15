/**
 *
 **/
#include <assert.h>
#include <string.h>

#include "pp_helper.h"
#include "tcp_socket.h"

TcpSocket::TcpSocket(pp::Instance* in) 
  : instance_(in), socket_(NULL), factory_(this) {
  log_ = new Logger(in);
}

TcpSocket::~TcpSocket() {
  assert(!socket_);
}

bool TcpSocket::connect(const char* host, uint16_t port) {
  log_->log("TcpSocket::connect");
  int32_t pres = PP_OK_COMPLETIONPENDING;
  assert(!socket_);
  socket_ = new pp::TCPSocketPrivate(instance_);
  pres = socket_->Connect(host, port, factory_.NewCallback(&TcpSocket::onConnect, &pres));
  log_->log(pperrorstr(pres));
  if (pres != PP_OK_COMPLETIONPENDING) {

  } else {

  }
  return true;
}

void TcpSocket::onConnect(int32_t result, int32_t* pres) {
  log_->log("TcpSocket::onConnect");
}

void TcpSocket::close() {
  log_->log("TcpSocket::close");
  if (socket_) {
    delete socket_;
    socket_ = NULL;
  }
}
