import sqlite3
import random

class Engine:
  """ Creates a querygen Engine against a provided DB """
  def __init__(self, db):
    self.db = db;
    self.tables = []
    self.schemas = {}
    self.learnSchema()

  def getQuery(self):
    table = self.getTable()
    return "SELECT * FROM " + table + " LIMIT 0,30";

  def learnSchema(self):
    for row in self.db.execute("SELECT * FROM sqlite_master WHERE type='table';"):
      self.tables.append(row[1])

  def getTable(self):
    return random.choice(self.tables)