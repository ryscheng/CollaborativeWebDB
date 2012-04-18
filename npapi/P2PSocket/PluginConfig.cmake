#/**********************************************************\ 
#
# Auto-Generated Plugin Configuration file
# for P2P Socket
#
#\**********************************************************/

set(PLUGIN_NAME "P2PSocket")
set(PLUGIN_PREFIX "PSOCK")
set(COMPANY_NAME "WebP2PTeam")

# ActiveX constants:
set(FBTYPELIB_NAME P2PSocketLib)
set(FBTYPELIB_DESC "P2PSocket 1.0 Type Library")
set(IFBControl_DESC "P2PSocket Control Interface")
set(FBControl_DESC "P2PSocket Control Class")
set(IFBComJavascriptObject_DESC "P2PSocket IComJavascriptObject Interface")
set(FBComJavascriptObject_DESC "P2PSocket ComJavascriptObject Class")
set(IFBComEventSource_DESC "P2PSocket IFBComEventSource Interface")
set(AXVERSION_NUM "1")

# NOTE: THESE GUIDS *MUST* BE UNIQUE TO YOUR PLUGIN/ACTIVEX CONTROL!  YES, ALL OF THEM!
set(FBTYPELIB_GUID 2cf6fae5-a517-5c4b-9bf2-8a225820ab2b)
set(IFBControl_GUID 409348b1-549f-51a1-a50f-914dddf6d820)
set(FBControl_GUID f1db033d-5224-591f-a665-ea66f9a50cbf)
set(IFBComJavascriptObject_GUID fd61aecb-d7d1-53f8-9d39-4e2e35748562)
set(FBComJavascriptObject_GUID 780e3c5a-ea88-54c8-8954-71c5bab34fd3)
set(IFBComEventSource_GUID 4343c829-bd8b-55da-baab-d8622baf23fa)

# these are the pieces that are relevant to using it from Javascript
set(ACTIVEX_PROGID "WebP2PTeam.P2PSocket")
set(MOZILLA_PLUGINID "cs.washington.edu/P2PSocket")

# strings
set(FBSTRING_CompanyName "WebP2P Team")
set(FBSTRING_PluginDescription "Allows Javascript to accept incoming connections.")
set(FBSTRING_PLUGIN_VERSION "1.0.0.0")
set(FBSTRING_LegalCopyright "Copyright 2012 WebP2P Team")
set(FBSTRING_PluginFileName "np${PLUGIN_NAME}.dll")
set(FBSTRING_ProductName "P2P Socket")
set(FBSTRING_FileExtents "")
set(FBSTRING_PluginName "P2P Socket")
set(FBSTRING_MIMEType "application/x-p2psocket")

# Uncomment this next line if you're not planning on your plugin doing
# any drawing:

set (FB_GUI_DISABLED 1)

# Mac plugin settings. If your plugin does not draw, set these all to 0
set(FBMAC_USE_QUICKDRAW 0)
set(FBMAC_USE_CARBON 0)
set(FBMAC_USE_COCOA 0)
set(FBMAC_USE_COREGRAPHICS 0)
set(FBMAC_USE_COREANIMATION 0)
set(FBMAC_USE_INVALIDATINGCOREANIMATION 0)

# If you want to register per-machine on Windows, uncomment this line
#set (FB_ATLREG_MACHINEWIDE 1)
