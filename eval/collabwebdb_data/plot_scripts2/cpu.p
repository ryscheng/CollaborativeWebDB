set autoscale
unset log
unset label
set title "Client and Server QPS Under Varying Workloads"
set xlabel "Time (sec)"
set ylabel "Load (QPS)"
set term jpeg
#set key off
set grid
set yrange [0:50]
set key at 1200, 30 horizontal

samples(x) = $0 > 9 ? 10 : ($0+1)
avg10(x) = (shift10(x), (b1+b2+b3+b4+b5+b6+b7+b8+b9+b10)/samples($0))
shift10(x) = (b10=b9, b9=b8, b8=b7, b7=b6, b6=b5, b5=b4, b4=b3, b3=b2, b2=b1, b1=x)

init(x) = (b1=b2=b3=b4=b5=b6=b7=b8=b9=b10=sum=0)

set style data linespoints
set output "50k-c1-servLoad.jpeg"
   plot sum = init(0), \
        "output.05.txt" using 1:(avg10($2)) title 'server, a=0.05', \
        "output.1.txt" using 1:(avg10($2)) title 'server, a=0.1', \
        "output.5.txt" using 1:(avg10($2)) title 'server, a=0.5', \
        "output1.txt" using 1:(avg10($2)) title 'server, a=1', \
        "cl.05.txt" using 1:(avg10($2)) title 'client, a=0.05', \
        "cl.1.txt" using 1:(avg10($2)) title 'client, a=0.1', \
        "cl.5.txt" using 1:(avg10($2)) title 'client, a=0.5', \
        "cl1.txt" using 1:(avg10($2)) title 'client, a=1'
