#!/usr/bin/env python

import json
import sys
import math

f = open(sys.argv[1], 'r')
data = json.loads(f.read())

client = data['clientStats'].values()[0]
clientCounts = client[0]['counts']

times = sorted(clientCounts.keys())
times = [math.floor(float(t)) for t in times]
minTime = min(times)

s = 0
for t in times:
    rebasedTime = t-minTime
    s += clientCounts[str(int(math.floor(t)))]
    if s > 10000:
        break
    print rebasedTime, s

