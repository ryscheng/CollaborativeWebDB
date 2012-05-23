#!/usr/bin/env python
"""
 Simple websocket rendezvous point for webp2p clients.
 Adapted from the tornado websocket chat demo.
"""

import os, sys, inspect, time
this_folder = os.path.abspath(os.path.split(inspect.getfile( inspect.currentframe() ))[0])
tornado_folder = os.path.join(this_folder, "tornado")
if tornado_folder not in sys.path:
  sys.path.insert(0, tornado_folder)

import base64
import logging
import sqlite3
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path
import urllib
import uuid

from tornado.options import define, options

default_port = 8080
if 'PORT' in os.environ:
  default_port = os.environ['PORT']
define("port", default=default_port, help="port", type=int)
define("data", default="data.sqlite3", help="database", type=str)


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/data.html", SubHandler),
            (r"/message", MessageHandler),
            (r"/data", DataHandler),
            (r"/evaluation", EvaluationHandler),
            (r"/evalWS", EvalWSHandler)
        ]
        settings = dict(
            cookie_secret=base64.b64encode(uuid.uuid4().bytes + uuid.uuid4().bytes),
            template_path=os.path.join(os.path.dirname(__file__), ".."),
            static_path=os.path.join(os.path.dirname(__file__), ".."),
            xsrf_cookies=True,
            autoescape=None,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

class EvaluationHandler(tornado.web.RequestHandler):
    def get(self):
      cmd = self.get_argument("command", default=None)
      if not cmd:
        self.render("index.html", evaluation=True)
      else:
        if cmd == "start":
          logging.info("starting evaluation") 
          EvalWSHandler.start_evaluation()
        elif cmd == "stop":
          logging.info("stopping evaluation")
          EvalWSHandler.stop_evaluation()


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", evaluation=False)

class SubHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("data.html")

class EvalData():
  count = 0 
  time = 0

class DataHandler(tornado.web.RequestHandler):
    pagesize = 30
    stats = EvalData()

    def initialize(self):
        if os.access(options.data, os.W_OK):
            logging.error("Database is mutable, chmod -w to fix.")
        if os.path.exists(options.data):
            self.db = sqlite3.connect(options.data)
        else:
            self.db = None


    def get(self):
        if EvalWSHandler.started:
          DataHandler.stats.count += 1
          startTime = time.time()

        q = urllib.unquote_plus(self.get_argument('q'))
        retval = {}
        if self.db:
            c = self.db.cursor()
            try:
                c.execute(q)
                retval['rows'] = c.fetchmany(DataHandler.pagesize)
                cols = [col[0] for idx,col in enumerate(c.description)]
                retval['cols'] = cols
            except Exception as e:
                retval['status'] = e.__str__()
        else:
            retval['status'] = 'No Data Available'

        self.write(retval)
        if EvalWSHandler.started:
          endTime = time.time()
          elapsed = endTime-startTime
          DataHandler.stats.time += elapsed
          logging.info("done with a get, count: %d, time: %f" % (DataHandler.stats.count, DataHandler.stats.time))
                
class EvalWSHandler(tornado.websocket.WebSocketHandler):
  evaluators = dict();
  started = False

  def allow_draft76(self):
    # for iOS 5.0 Safari
    return True
    
  def open(self):
    self.id = uuid.uuid4()
    EvalWSHandler.evaluators[self.id] = self
  
  def on_close(self):
    if self.id in EvalWSHandler.evaluators:
      del EvalWSHandler.evaluators[self.id]

  def on_message(self, message):
    logging.info("evalWS handler got message %r", message)
    # do something with the message

    parsed = tornado.escape.json_decode(message)
    if "payload" in parsed:
      if "command" in parsed["payload"]:
        if parsed["payload"]["command"] == "start":
          logging.info("...starting evaluation")
        elif parsed["payload"]["command"] == "stop": 
          logging.info("...stoping evaluation")

  @classmethod
  def start_evaluation(self):
    EvalWSHandler.started = True
    for e in EvalWSHandler.evaluators:
      EvalWSHandler.evaluators[e].write_message({"command": "start"})
    
  @classmethod
  def stop_evaluation(self):
    EvalWSHandler.started = False
    for e in EvalWSHandler.evaluators:
      EvalWSHandler.evaluators[e].write_message({"command": "stop"})


      

class MessageHandler(tornado.websocket.WebSocketHandler):
    waiters = dict()
    hashes = dict()

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
      self.id = 0
      self.hashes = []

    def on_close(self):
        if self.id:
          del MessageHandler.waiters[self.id]
          MessageHandler.send_updates({"from": 0, "id": self.id, "event": "disconnect"});
          for key in self.hashes:
            MessageHandler.hashes[key].remove(self.id)


    @classmethod
    def send_updates(cls, chat):
        logging.info("sending message to %d waiters", len(cls.waiters))
        for waiter in cls.waiters.values():
            try:
                waiter.write_message(chat)
            except:
                logging.error("Error sending message", exc_info=True)

    def on_message(self, message):
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)
        if "payload" in parsed:
          if "event" in parsed["payload"] and parsed["payload"]["event"]=="register":
            # registration.
            if self.id == 0:
              self.id = str(uuid.uuid4())
              MessageHandler.waiters[self.id] = self
              self.write_message({"id":self.id, "from":0, "event": "register"})
            else:
              self.write_message({"id":self.id, "from":0, "event": "register"})
          elif "event" in parsed["payload"] and parsed["payload"]["event"] == "announce":
            # handle announces.
            # todo: rate limiting.
            if self.id != 0:
              parsed["payload"]["from"] = self.id
              MessageHandler.send_updates(parsed["payload"])
          elif "event" in parsed["payload"] and parsed["payload"]["event"] == "get":
            if self.id != 0 and "key" in parsed["payload"]:
              key = parsed["payload"]["key"]
              if key in MessageHandler.hashes:
                self.write_message({"from":0, "event":"list", "key":key, "ids":MessageHandler.hashes[key]})
              else:
                self.write_message({"from":0, "event":"list", "key":key, "ids":[]})
          elif "event" in parsed["payload"] and parsed["payload"]["event"] == "set":
            if self.id != 0 and "key" in parsed["payload"]:
              key = parsed["payload"]["key"]
              self.hashes.push(key)
              if key in MessageHandler.hashes:
                MessageHandler.hashes[key].append(self.id)
              else:
                MessageHandler.hashes[key] = [self.id]
          else:
            # direct message.
            recip_id = parsed["payload"]["to"]
            if recip_id in MessageHandler.waiters and self.id != 0:
              parsed["payload"]["from"] = self.id
              MessageHandler.waiters[recip_id].write_message(parsed["payload"])


def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
