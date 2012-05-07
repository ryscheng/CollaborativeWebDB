var network_pane = {
    init: function() {
        var siz = this.network_size();
        $('#network').empty();
    
        this.canvas = d3.select("#network").append("svg")
            .attr("width", siz[0])
            .attr("height", siz[1]);
        var color = d3.scale.category20();
        this.force = d3.layout.force()
            .charge(-120)
            .linkDistance(100)
            .size(siz);

        this.force.nodes(this.nodes).links(this.links).start();
        var link = this.canvas.selectAll("line.link").data(this.links)
            .enter().append("line")
            .style("stroke", "#999")
            .style("stroke-opacity", .6)
            .style("stroke-width", 1.5);

        var node = this.canvas.selectAll("circle.node")
            .data(this.nodes)
            .enter().append("g")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .call(this.force.drag);

        node.append("circle")
            .attr("r", 25)
            .style("stroke", "#fff")
            .style("stroke-width", 1.5)
            .style("fill", function(d) {return color(d.group); })

        node.append("title")
            .text(function(d) {return d.name; });
        
        node.append("text")
            .style("stroke", "#333")
            .style("stroke-width", 0)
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .text(function(d) {return d.name; });

        /* Force Update Handle */
        this.force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
 
            node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

        /*  Resize Event Handler */
        var boundResize = this.resize.bind(this);
        $(window).resize(boundResize);

    },
    resize: function() {
        var siz = this.network_size();
        this.canvas.attr("width", siz[0])
           .attr("height", siz[1]);
        this.force.size(siz).start();
    },

    network_size: function() {
      return [ $('#network').width(), $('#network').height() - 10 ];
    },
    
    nodes:[{name:"You", group:0},{name:"Server", group:1}],
    links:[{"source":0, "target":1}]
};