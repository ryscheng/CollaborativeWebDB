set autoscale
unset log
unset label
set title "Server and Client Load Under Varied Number of Peers"
set xlabel "Time (sec)"
set ylabel "Cumulative Queries Processed"
set term jpeg
#set key off
set grid
set yrange [1:12000]
set logscale y

set key right bottom


set style data linespoints
set output "10k-a0.5clientVsServProcessed.jpeg"
   plot "10k-c2-a.5-serverPoints.txt" using 1:2 title 'server, 2 clients', \
        "10k-c2-a.5-clientPoints.txt" using 1:2 title 'clients, 2 clients', \
        "10k-c1-a.5-serverPoints.txt" using 1:2 title 'server, 1 client', \
        "10k-c1-a.5-clientPoints.txt" using 1:2 title 'client, 1 client'
