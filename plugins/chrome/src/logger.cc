/**
 *
 **/

#include "logger.h"

Logger::Logger(pp::Instance* in) 
  : instance_(in) {
}

Logger::~Logger() {
}

void Logger::log(char const* msg) {
  pp::Var var_msg = pp::Var(msg);
  instance_->PostMessage(var_msg);
}

void Logger::log(std::string msg) {
  pp::Var var_msg = pp::Var(msg);
  instance_->PostMessage(var_msg);
}

void Logger::log(char* msg) {
  pp::Var var_msg = pp::Var(msg);
  instance_->PostMessage(var_msg);
}

void Logger::log(int32_t msg) {
  pp::Var var_msg = pp::Var(msg);
  instance_->PostMessage(var_msg);
}
