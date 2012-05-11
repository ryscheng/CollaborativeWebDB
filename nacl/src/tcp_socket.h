#ifndef TCP_SOCKET_H
#define TCP_SOCKET_H

#include "ppapi/cpp/completion_callback.h"
#include "ppapi/utility/completion_callback_factory.h"
#include "ppapi/cpp/private/tcp_socket_private.h"

#include "pthread_helpers.h"
#include "nacl_transport.h"

class TcpSocket {
  public:
    TcpSocket(NaclTransportInstance* in);
    virtual ~TcpSocket();

    bool connect(const char* host, uint16_t port);
    void onConnect(int32_t result, int32_t* pres);
    void close();

  private:
    NaclTransportInstance* instance_;
    pp::TCPSocketPrivate* socket_;
    pp::CompletionCallbackFactory<TcpSocket, ThreadSafeRefCount> factory_;
};

#endif
