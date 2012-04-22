/**********************************************************\

  Auto-generated P2PSocketAPI.h

\**********************************************************/

#include <string>
#include <sstream>
#include <boost/weak_ptr.hpp>
#include "JSAPIAuto.h"
#include "BrowserHost.h"
#include "P2PSocket.h"
#include <fcntl.h>
#include <pthread.h>
#include <sys/socket.h>

#ifndef H_P2PSocketAPI
#define H_P2PSocketAPI

class P2PSocketAPI : public FB::JSAPIAuto
{
public:
    ////////////////////////////////////////////////////////////////////////////
    /// @fn P2PSocketAPI::P2PSocketAPI(const P2PSocketPtr& plugin, const FB::BrowserHostPtr host)
    ///
    /// @brief  Constructor for your JSAPI object.
    ///         You should register your methods, properties, and events
    ///         that should be accessible to Javascript from here.
    ///
    /// @see FB::JSAPIAuto::registerMethod
    /// @see FB::JSAPIAuto::registerProperty
    /// @see FB::JSAPIAuto::registerEvent
    ////////////////////////////////////////////////////////////////////////////
    P2PSocketAPI(const P2PSocketPtr& plugin, const FB::BrowserHostPtr& host) :
        m_plugin(plugin), m_host(host)
    {
        event_thread = NULL;

        // Auto-generated
        registerMethod("echo",      make_method(this, &P2PSocketAPI::echo));
        registerMethod("testEvent", make_method(this, &P2PSocketAPI::testEvent));
        
        // Read-write property
        registerProperty("testString",
                         make_property(this,
                                       &P2PSocketAPI::get_testString,
                                       &P2PSocketAPI::set_testString));
        
        // Read-only property
        registerProperty("version",
                         make_property(this,
                                       &P2PSocketAPI::get_version));
       
        /// Socket interface
        registerMethod("bind", make_method(this, &P2PSocketAPI::start_server)); 
        registerMethod("connect", make_method(this, &P2PSocketAPI::start_client)); 
        registerMethod("send", make_method(this, &P2PSocketAPI::send));

        // initial state
        thread_signal_fd = -1;
    }

    ///////////////////////////////////////////////////////////////////////////////
    /// @fn P2PSocketAPI::~P2PSocketAPI()
    ///
    /// @brief  Destructor.  Remember that this object will not be released until
    ///         the browser is done with it; this will almost definitely be after
    ///         the plugin is released.
    ///////////////////////////////////////////////////////////////////////////////
    virtual ~P2PSocketAPI() {
        if (thread_signal_fd > -1) {
            close(thread_signal_fd);
        }
    };

    P2PSocketPtr getPlugin();

    /// Auto-generated Methods
    // Read/Write property ${PROPERTY.ident}
    std::string get_testString();
    void set_testString(const std::string& val);

    // Read-only property ${PROPERTY.ident}
    std::string get_version();

    // Method echo
    FB::variant echo(const FB::variant& msg);
    
    // Event helpers
    FB_JSAPI_EVENT(test, 0, ());
    FB_JSAPI_EVENT(echo, 2, (const FB::variant&, const int));

    // Method test-event
    void testEvent();

    /// Socket interface
    std::string start_server(int port);
    std::string start_client(const FB::variant& destination);
    std::string send(const std::string& message);
    FB_JSAPI_EVENT(message, 1, (const FB::variant&));

private:
    static void* run(void* args);
    std::string start_event_thread(int, int);

    int thread_signal_fd;
    pthread_t event_thread;
    P2PSocketWeakPtr m_plugin;
    FB::BrowserHostPtr m_host;

    std::string m_testString;
};

#endif // H_P2PSocketAPI

