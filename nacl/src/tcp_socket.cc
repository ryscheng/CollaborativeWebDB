/**
 *
 **/
#include <assert.h>
#include <string.h>

#include "pp_helper.h"
#include "tcp_socket.h"

TcpSocket::TcpSocket(NaclTransportInstance* in) 
  : instance_(in), socket_(NULL), factory_(this) {
}

TcpSocket::~TcpSocket() {
  assert(!socket_);
}

bool TcpSocket::connect(const char* host, uint16_t port) {
  instance_->log("TcpSocket::connect");
  int32_t pres = PP_OK_COMPLETIONPENDING;
  assert(!socket_);
  socket_ = new pp::TCPSocketPrivate(instance_);
  pres = socket_->Connect(host, port, factory_.NewCallback(&TcpSocket::onConnect, &pres));
  instance_->log(pperrorstr(pres));
  if (pres != PP_OK_COMPLETIONPENDING) {

  } else {

  }
  return true;
}

void TcpSocket::onConnect(int32_t result, int32_t* pres) {
  instance_->log("TcpSocket::onConnect");
}

void TcpSocket::close() {
  instance_->log("TcpSocket::close");
  if (socket_) {
    delete socket_;
    socket_ = NULL;
  }
}
