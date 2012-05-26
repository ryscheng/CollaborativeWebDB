var network_pane = {
    init: function() {    
        var siz = this.network_size();
        $('#network').empty();
    
        this.canvas = d3.select("#network").append("svg")
            .attr("width", siz[0])
            .attr("height", siz[1]);
        this.force = d3.layout.force()
            .charge(-120)
            .linkDistance(100)
            .size(siz);
        this.color = d3.scale.category20();

        /*  Resize Event Handler */
        var boundResize = this.resize.bind(this);
        $(window).resize(boundResize);

        this.restore();

        /* Force Update Handle */
        var that = this;
        this.force.on("tick", function() {
          that.canvas.selectAll("g").attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });

          that.canvas.selectAll("line").attr("x1", function(d) {
            return d.source.x;
          }).attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });
        });
    },
    restore: function() {
        var that = this;
        this.force.nodes(this.nodes).links(this.links).start();
        var link = this.canvas.selectAll("line").data(this.links)
            .enter().insert("line", "g")
            .style("stroke", "#999")
            .style("stroke-opacity", .6)
            .style("stroke-width", 1.5);

        var node = this.canvas.selectAll("g")
            .data(this.nodes)
            .enter().append("g")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")";
            }).call(this.force.drag);

        node.append("circle")
            .attr("r", 25)
            .style("stroke", "#fff")
            .style("stroke-width", 1.5)
            .style("fill", function(d) { return that.color(d.group); })

        node.append("title")
            .text(function(d) { return d.name; });

        node.append("text")
            .style("stroke", "#333")
            .style("stroke-width", 0)
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .text(function(d) { return d.name.substr(0,8); });
    },
    resize: function() {
        var siz = this.network_size();
        this.canvas.attr("width", siz[0])
           .attr("height", siz[1]);
        this.force.size(siz).start();
    },
    get_node_idx: function(id) {
      for (var i = 0; i < this.nodes.length; i++) {
        if(this.nodes[i].name == id) {
          return i;
        }
      }
      return -1;
    },
    saw_node: function(id) {
      if (this.get_node_idx(id) > -1) {
        return;
      }
      this.nodes.push({name:id, group:2});
      this.links.push({"source":this.nodes.length - 1, "target":1});
      this.restore();
    },
    channel_node: function(id) {
      var idx = this.get_node_idx(id);
      if (idx == -1) {
        return;
      }
      this.links.push({"source":idx, "target":0});
    },
    drop_node: function(id) {
      var idx = this.get_node_idx(id);
      if (idx == -1) {
        return;
      }
      this.canvas.selectAll("g").data([this.nodes[idx]]).exit().remove();
      this.nodes.splice(idx,1);
      var link_idx = [];
      for (var i = 0; i < this.links.length; i ++) {
        var src = this.links[i]['source'];
        var trgt = this.links[i]['target'];
        
        if ((src['name'] && src['name'] == id) ||
            (trgt['name'] && trgt['name'] == id) ||
            src == idx ||
            trgt == idx) {
          link_idx.push(i);
        }
      }
      link_idx.reverse();
      for (var i = 0; i < link_idx.length; i++) {
        this.canvas.selectAll("line").data([this.links[link_idx[i]]]).exit().remove();
        this.links.splice(link_idx[i], 1);
      }
      this.restore();
    },

    network_size: function() {
      return [ $('#network').width(), $('#network').height() - 10 ];
    },
    
    nodes:[{name:"You", group:0}, {name:"Server", group:1}],
    links:[{"source":0, "target":1}],
};