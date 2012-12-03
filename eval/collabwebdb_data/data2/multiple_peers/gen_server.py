#!/usr/bin/env python

import json
import sys
import math

f = open(sys.argv[1], 'r')
data = json.loads(f.read())
server = data['serverStats'][0]
serverCounts = server['counts']
times = sorted(serverCounts.keys())
times = [math.floor(float(t)) for t in times]
minTime = min(times)

s = 0
for t in times:
    rebasedTime = t-minTime
    if rebasedTime > 261:
        break
    s += serverCounts[str(t)]
    print rebasedTime, s

