#ifndef TCP_SOCKET_H
#define TCP_SOCKET_H

#include "ppapi/cpp/completion_callback.h"
#include "ppapi/cpp/private/tcp_socket_private.h"

class TcpSocket {
  public:
    TcpSocket();
    virtual ~TcpSocket();
  private:
    pp::TCPSocketPrivate* socket_;
};

#endif
