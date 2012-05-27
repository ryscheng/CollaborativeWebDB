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
    cols = self.getColumns(table)
    return "SELECT " + ','.join(cols) + " FROM " + table + " LIMIT 0,30";

  def getTable(self):
    return random.choice(self.tables)

  def getColumns(self, table):
    num = random.randint(1, len(self.schemas[table]))
    return [col[1] for col in random.sample(self.schemas[table], num)]

  def learnSchema(self):
    for row in self.db.execute("SELECT * FROM sqlite_master WHERE type='table';"):
      self.tables.append(row[1])
      self.schemas[row[1]] = [col for col in self.db.execute("PRAGMA table_info("+row[1]+");")]
    