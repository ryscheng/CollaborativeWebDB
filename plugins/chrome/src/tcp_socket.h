#ifndef TCP_SOCKET_H
#define TCP_SOCKET_H

#include "ppapi/cpp/completion_callback.h"
#include "ppapi/utility/completion_callback_factory.h"
#include "ppapi/cpp/private/tcp_socket_private.h"

#include "pthread_helpers.h"
#include "logger.h"

class TcpSocket {
  public:
    TcpSocket(pp::Instance* in);
    virtual ~TcpSocket();

    bool connect(const char* host, uint16_t port);
    void onConnect(int32_t result, int32_t* pres);
    void close();

  private:
    pp::Instance* instance_;
    Logger* log_;
    pp::TCPSocketPrivate* socket_;
    pp::CompletionCallbackFactory<TcpSocket, ThreadSafeRefCount> factory_;
};

#endif
