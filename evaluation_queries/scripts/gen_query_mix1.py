#!/usr/bin/python

import Pyro4
import sys
import os
import errno
import random
import gzip
import resource
import logging
import logging.handlers
import time
from datetime import datetime
from optparse import OptionParser
import subprocess, threading
import re
import sqlite3
from operator import itemgetter

def main():

	conn = sqlite3.connect('../../server/tpc-h.db')
	c = conn.cursor()
	
	num_queries = int(sys.argv[1])
	out = open(sys.argv[2],"w")
	query_count = 0
	while query_count < num_queries:
		os.chdir("../")
		os.system('./qgen > output.txt')
		os.chdir("scripts")
		
		query_input = open('../output.txt', "r")
		q = ""
		inQuery = False
		count = 0
		for line in query_input:
			if line.find("select") >= 0:
				inQuery = True
			if line.find("rowcount") >= 0:
				inQuery = False
				out.write(q)
				out.write("|\n")
				query_count += 1
				count += 1
				print query_count
				#c.execute(q)
				#for row in c:
				#	print row
				q = ""
				if count==5:
					break
				if query_count==num_queries:
					break
				
			if not inQuery:
				continue
			if line.find("extract") >= 0:
                                fields = line.split()
                                a = fields[2].strip(')')
                                q += a + " " + fields[3] + " " + fields[4] + '\n'
                                continue

			if line.find(" date") >= 0:
				fields = line.split()
				idx = fields.index("date")
				date = fields[idx+1]
				idx1 = line.find(" date")
				s = line[0:idx1+5] + "(" + date
				interval = False
				if line.find("interval") >= 0:
					interval = True
					op = fields[idx+2]
					amt = fields[idx+4].strip("'")
					time_unit = fields[idx+5]
					s +=  ", '" + op + amt + " " + time_unit + "'"
				elif line.find("between") >= 0:
                                        date2 = fields[idx+4]
                                        s += ") and date(" + date2

				
				s +=  ")\n"
				q += s
			else:
				q += line
			out.flush()
		out.flush()
		#sys.exit()


	

if __name__ == '__main__':
	sys.exit(main())

