/**********************************************************\

  Auto-generated P2PSocketAPI.cpp

\**********************************************************/

#include "JSObject.h"
#include "variant_list.h"
#include "DOM/Document.h"
#include "global/config.h"

#include "P2PSocketAPI.h"

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
std::string P2PSocketAPI::bind(int port)
{
    int ret;

    if (event_thread != NULL) {
        return "Socket already activated";
    }
    ret = pthread_create( &event_thread, NULL, &P2PSocketAPI::run, NULL);
    if (ret != 0) {
        return "Failed to create thread";
    }
    

    return "bind not implemented";
}

std::string P2PSocketAPI::connect(const FB::variant& destination)
{
  return "connect not implemented";
}

std::string P2PSocketAPI::send(const std::string& message)
{
  return "send not implemented";
}

void* P2PSocketAPI::run(void* args)
{

}
