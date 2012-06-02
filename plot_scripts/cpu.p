set autoscale
unset log
unset label
set title "comparing server and client loads"
set xlabel "time (sec)"
set ylabel "number of requests being served"
set term jpeg
#set key off
set grid

set output "servLoad.jpeg"
   plot "output.5.txt" using 1:2 title 'a=0.5' with linespoints, \
        "output1.txt" using 1:2 title 'a=1' with linespoints, \
	"output2.txt" using 1:2 title 'a=2' with linespoints, \
	"cl.txt" using 1:2 title 'client' with linespoints