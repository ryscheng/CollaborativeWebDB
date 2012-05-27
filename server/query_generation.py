#!/usr/bin/env python
"""
  Simple test script for printing out a randomly generated query.
"""

import querygen.engine
import sqlite3

def main():
  db = sqlite3.connect("data.sqlite3")
  engine = querygen.engine.Engine(db)
  print engine.getQuery()
  
if __name__ == "__main__":
  main()