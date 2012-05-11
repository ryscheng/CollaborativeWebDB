export NACL_EXE_STDOUT=DEBUG_ONLY:dev://postmessage
export NACL_EXE_STDERR=DEBUG_ONLY:dev://postmessage
google-chrome --enable-nacl --allow-nacl-socket-api="*" --enable-media-stream
