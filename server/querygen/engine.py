import sqlite3

class Engine:
  """ Creates a querygen Engine against a provided DB """
  def __init__(self, db):
    self.db = db;

  def getQuery(self):
    return "SELECT * FROM table LIMIT 0,30";

  def learnSchema(self):
    cursor = self.db.cursor()
    cursor.execute("SELECT * FROM sqlite_master WHERE type='table';")
    cursor.fetchall()