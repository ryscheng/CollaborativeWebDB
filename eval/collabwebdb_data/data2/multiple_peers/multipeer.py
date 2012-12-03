#!/usr/bin/env python

import json


class Point(object):
    def __init__(self,time,d):
        self.time = time
        self.d = d

input = open(sys.argv[1], "r")

serv_output = open(sys.argv[2], "w")
client_output = open(sys.argv[3], "w")

