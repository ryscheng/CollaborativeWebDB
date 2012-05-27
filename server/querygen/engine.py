import math
import sqlite3
import random

class Engine:
  """ Creates a querygen Engine against a provided DB """
  def __init__(self, db, skew = 1):
    self.db = db;
    self.alpha = skew
    self.tables = []
    self.tablelengths = []
    self.schemas = {}
    self.learnSchema()

  def getQuery(self):
    table = self.getTable()
    cols = self.getColumns(table)
    bound = str(self.getOffset(table))
    return "SELECT " + ','.join(cols) + " FROM " + table + " LIMIT " + bound + ",30";

  def getTable(self):
    return random.choice(self.tables)

  def getColumns(self, table):
    num = random.randint(1, len(self.schemas[table]))
    return [col[1] for col in random.sample(self.schemas[table], num)]

  def getOffset(self, table):
    idx = self.tables.index(table)
    max = self.tablelengths[idx]
    return int(self.boundedPareto(self.alpha, max))

  def learnSchema(self):
    for row in self.db.execute("SELECT * FROM sqlite_master WHERE type='table';"):
      print "Loading " + row[1]
      self.tables.append(row[1])
      self.tablelengths.append(self.db.execute("SELECT COUNT(*) FROM " + row[1]).fetchone()[0])
      self.schemas[row[1]] = [col for col in self.db.execute("PRAGMA table_info("+row[1]+");")]

  def boundedPareto(self, alpha, max):
    u = random.random()
    max += 1
    continuous = (-(u * max ** alpha - u - max **alpha) / (max ** alpha)) ** (-1 / alpha)
    return math.floor(continuous - 0.5)