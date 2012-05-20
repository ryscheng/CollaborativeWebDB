/**********************************************************\

  Auto-generated P2PSocketAPI.cpp

\**********************************************************/

#include "JSObject.h"
#include "variant.h"
#include "variant_list.h"
#include "DOM/Document.h"
#include "global/config.h"
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netdb.h>
#include <poll.h>
#include <sys/types.h>

#include "P2PSocketAPI.h"

#define MAX_PENDING 1
#define POLL_TIMEOUT_MS 60*1000
#define MESSAGE_SIZE 2048

struct socket_thread {
  int fd[3];
  P2PSocketAPI* owner;
};

///////////////////////////////////////////////////////////////////////////////
/// @fn FB::variant P2PSocketAPI::echo(const FB::variant& msg)
///
/// @brief  Echos whatever is passed from Javascript.
///         Go ahead and change it. See what happens!
///////////////////////////////////////////////////////////////////////////////
FB::variant P2PSocketAPI::echo(const FB::variant& msg)
{
    static int n(0);
    fire_echo("So far, you clicked this many times: ", n++);

    // return "foobar";
    return msg;
}

///////////////////////////////////////////////////////////////////////////////
/// @fn P2PSocketPtr P2PSocketAPI::getPlugin()
///
/// @brief  Gets a reference to the plugin that was passed in when the object
///         was created.  If the plugin has already been released then this
///         will throw a FB::script_error that will be translated into a
///         javascript exception in the page.
///////////////////////////////////////////////////////////////////////////////
P2PSocketPtr P2PSocketAPI::getPlugin()
{
    P2PSocketPtr plugin(m_plugin.lock());
    if (!plugin) {
        throw FB::script_error("The plugin is invalid");
    }
    return plugin;
}

// Read/Write property testString
std::string P2PSocketAPI::get_testString()
{
    return m_testString;
}

void P2PSocketAPI::set_testString(const std::string& val)
{
    m_testString = val;
}

// Read-only property version
std::string P2PSocketAPI::get_version()
{
    return FBSTRING_PLUGIN_VERSION;
}

void P2PSocketAPI::testEvent()
{
    fire_test();
}


/// Socket interface.
std::string P2PSocketAPI::start_server(int port)
{
    struct sockaddr_in sin;
    bzero((char *)&sin, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = INADDR_ANY;
    sin.sin_port = htons(port);
    int server = -1;
    if ((server = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        return "Couldn't create socket";
    }

    /* Make the socket non-blocking */
    int sockopt, one = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
    if ((sockopt = fcntl(server, F_GETFL)) < 0) {
        return "Couldn't get socket options";
    }
    if ((fcntl(server, F_SETFL, (sockopt | O_NONBLOCK))) < 0) {
        return "Couldn't set socket nonblocking";
    }

    if ((bind(server, (struct sockaddr *)&sin, sizeof(sin))) < 0) {
        return "Couldn't bind socket";
    }
    listen(server, MAX_PENDING);
    return start_event_thread(server, -1);
}

std::string P2PSocketAPI::start_client(const FB::variant& destination)
{
    assert(destination.is_of_type<FB::VariantMap>());
    short port;
    std::string host;
    struct hostent *hp;

    try {
        FB::VariantMap dest = destination.convert_cast<FB::VariantMap>();
        port = dest["port"].convert_cast<short>();
        host = dest["host"].convert_cast<std::string>(); 
    } catch(FB::bad_variant_cast& e) {
        return e.what();
    }

    hp = gethostbyname(host.c_str());
    if (!hp) {
        return "Couldn't resolve host";
    }

    struct sockaddr_in sin;
    bzero((char *)&sin, sizeof(sin));
    sin.sin_family = AF_INET;
    bcopy(hp->h_addr, (char *)&sin.sin_addr, hp->h_length);
    sin.sin_port = htons(port);

    /* active open */
    int client;
    if ((client = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        return "Couldn't create socket.";
    }
    if (connect(client, (struct sockaddr *)&sin, sizeof(sin)) < 0) {
        return "Couldn't connect socket.";
        close(client);
    }
    return start_event_thread(-1, client);
}

std::string P2PSocketAPI::send(const std::string& message)
{
    if (thread_signal_fd == -1) {
        return "Socket not activated";
    }
    write(thread_signal_fd, message.c_str(), message.size());
    return "ok";
}

std::string P2PSocketAPI::start_event_thread(int server, int client)
{
    int ret;
    int pipefd[2];
    if (pipe(pipefd) < 0) {
        return "Could not create communication pipe.";
    }
    this->thread_signal_fd = pipefd[1];

    if (event_thread != NULL) {
        return "Socket already activated";
    }
    struct socket_thread* st = (struct socket_thread*)malloc(sizeof(struct socket_thread));
    st->fd[0] = pipefd[0];
    st->fd[1] = server;
    st->fd[2] = client;
    st->owner = this;
    ret = pthread_create( &event_thread, NULL, &P2PSocketAPI::run, st);
    if (ret != 0) {
        return "Failed to create thread";
    }
    return "ok";
}


void* P2PSocketAPI::run(void* args)
{
    struct socket_thread* st = (struct socket_thread*)args;
    int pipe = st->fd[0];
    int server = st->fd[1];
    int client = st->fd[2];
    
    char* buf = (char*)malloc(MESSAGE_SIZE);
    size_t buf_len = 0;

    while(1) {
        /* Set up poll data structures. */
        struct pollfd* pollfds;
        nfds_t total = 1;
        if (server > -1) {
            total += 1;
        }
        if (client > -1) {
            total += 1;
        }
        pollfds = (struct pollfd*)malloc(sizeof(struct pollfd) * total);
        // Message Passing
        total = 0;
        pollfds[total].fd = pipe;
        pollfds[total].events = POLLIN;
        pollfds[total].revents = 0;
        // Server Socket        
        if (server > -1) {
            total += 1;
            pollfds[total].fd = server;
            pollfds[total].events = POLLIN;
            pollfds[total].revents = 0;
        }
        // Client Socket        
        if (client > -1) {
            total += 1;
            pollfds[total].fd = client;
            pollfds[total].events = POLLIN;
            pollfds[total].revents = 0;
        }
        poll(pollfds, total, POLL_TIMEOUT_MS);

        for (int i = 0; i < total; i++) {
            if (pollfds[i].revents == pollfds[i].events) {
                continue;
            }
            if (pollfds[i].fd == pipe) {
                char buf[MESSAGE_SIZE];
                size_t len = read(pipe, &buf, MESSAGE_SIZE);
                if (len <= 0) {
                    free(args);
                    if(server > -1) close(server);
                    if(client > -1) close(client);
                    free(args);
                    pthread_exit(NULL);
                } else if (client > -1) {
                    write(client, buf, len);
                    write(client, '\0', 1);
                } else {
                    FB::VariantMap msg;
                    msg["error"] = "client disconnected";
                    st->owner->fire_message(msg);
                }
            }
            if (pollfds[i].fd == server) {
                struct sockaddr_in client_addr;
                socklen_t accept_addrlen;
                if ((client = accept(server, (struct sockaddr*)&client_addr, &accept_addrlen)) < 0) {
                    perror("client accept failure");
                    exit(1);
                }
                int sockopt;
                if ((sockopt = fcntl(client, F_GETFL)) < 0) {
                    perror("client options failure");
                    exit(1);
                }
                if ((fcntl(client, F_SETFL,(sockopt | O_NONBLOCK))) < 0) {
                    perror("client non-blocking failure");
                    exit(1);
                }
                char s[256];
                inet_ntop(AF_INET, &(client_addr.sin_addr),s, 255);
                FB::VariantMap msg;
                msg["event"] = "client disconnected";
                st->owner->fire_message(msg);
            }
            if (pollfds[i].fd == client) {
                size_t len = recv(client,
                    buf + buf_len,
                    MESSAGE_SIZE - buf_len,
                    0);
                // Client closed.
                if (len <= 0) {
                    close(client);
                    client = -1;
                    FB::VariantMap msg;
                    msg["event"] = "client disconnected";
                    st->owner->fire_message(msg);
                    if (server < 0) {
                        free(args);
                        pthread_exit(NULL);
                    }
                } else {
                    buf_len += len;
                    //emit finished messages.
                }
            }
        }
        free(args);
    }
}
