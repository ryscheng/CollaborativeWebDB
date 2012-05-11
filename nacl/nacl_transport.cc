/**
 * Module Entry point for NaCl Transport
 * @author ryscheng
 * @project WebP2P
 **/
#include <stdio.h>
#include <string.h>
#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"

#include "tcp_socket.h"

namespace {
  const char* const kLoadedStr = "LOADED";
  const char* const kReplyStr = "HEWO BACK ATCHA";
}

/// The Instance class.  One of these exists for each instance of your NaCl
/// module on the web page.  The browser will ask the Module object to create
/// a new Instance for each occurence of the <embed> tag that has these
/// attributes:
///     type="application/x-nacl"
///     src="hello_tutorial.nmf"
/// To communicate with the browser, you must override HandleMessage() for
/// receiving messages from the borwser, and use PostMessage() to send messages
/// back to the browser.  Note that this interface is entirely asynchronous.
class NaclTransportInstance : public pp::Instance {
  public:
    /// The constructor creates the plugin-side instance.
    /// @param[in] instance the handle to the browser-side plugin instance.
    explicit NaclTransportInstance(PP_Instance instance) : pp::Instance(instance) {
    }
    virtual ~NaclTransportInstance() {
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
    virtual void HandleMessage(const pp::Var& var_message) {
      // TODO(sdk_user): 1. Make this function handle the incoming message.
      if (!var_message.is_string()) {
        return;
      }
      TcpSocket* sock = new TcpSocket(); 
      delete sock;
      this->log(kReplyStr);
    }

    void log(char const* msg) {
      pp::Var var_msg = pp::Var(msg);
      PostMessage(var_msg);
    }
  private:
};


//---------------------------------------------------------------------------------
/// The Module class.  The browser calls the CreateInstance() method to create
/// an instance of your NaCl module on the web page.  The browser creates a new
/// instance for each <embed> tag with type="application/x-nacl".
class NaclTransportModule : public pp::Module {
  public:
    NaclTransportModule() : pp::Module() {}
    virtual ~NaclTransportModule() {}
    /// Create and return a NaclTransportInstance object.
    /// @param[in] instance The browser-side instance.
    /// @return the plugin-side instance.
    virtual pp::Instance* CreateInstance(PP_Instance instance) {
      return new NaclTransportInstance(instance);
    }
};

namespace pp {
  /// Factory function called by the browser when the module is first loaded.
  /// The browser keeps a singleton of this module.  It calls the
  /// CreateInstance() method on the object you return to make instances.  There
  /// is one instance per <embed> tag on the page.  This is the main binding
  /// point for your NaCl module with the browser.
  Module* CreateModule() {
    return new NaclTransportModule();
  }
}


