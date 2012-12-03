#!/bin/sh

./gen_clients.py 10k-c2-a.05.json > 10k-c2-a.05-clientPoints.txt
./gen_clients.py 50k-c1-a.05.json > 10k-c1-a.05-clientPoints.txt
./gen_server.py 10k-c2-a.05.json > 10k-c2-a.05-serverPoints.txt
./gen_server.py 50k-c1-a.05.json > 10k-c1-a.05-serverPoints.txt

