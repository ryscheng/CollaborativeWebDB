/**
 *
 **/
#include <assert.h>
#include <string.h>


#include "tcp_socket.h"

TcpSocket::TcpSocket(NaclTransportInstance* in) 
  : instance_(in), socket_(NULL), factory_(this) {
}

TcpSocket::~TcpSocket() {
  assert(!socket_);
}

bool TcpSocket::connect(const char* host, uint16_t port) {
  int32_t pres = PP_OK_COMPLETIONPENDING;
  assert(!socket_);
  socket_ = new pp::TCPSocketPrivate(instance_);
  socket_->Connect(host, port, factory_.NewCallback(&TcpSocket::onConnect, &pres));
  return true;
}

void TcpSocket::onConnect(int32_t result, int32_t* pres) {
  instance_->log("onConnect");
}

void TcpSocket::close() {
  if (socket_) {
    delete socket_;
    socket_ = NULL;
  }
}
