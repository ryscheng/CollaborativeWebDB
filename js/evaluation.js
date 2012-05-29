var evaluation = {
  socket: null,
  started: false,
  myTableCreated: false, 

  oldPeerDataRecv: 0,
  oldServerDataRecv: 0,
  
  binSize: 1, // bin size in seconds of timeseries 
  stats: {},

  queries: [],

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
  },

  start: function() { 
    ////console.debug('creating websocket for eval');
    var url = "ws://" + location.host + "/evalWS";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    ////console.debug(this.socket);

    var that = this;
    this.socket.onmessage = function(event) {
      var msg = JSON.parse(event.data);
      if (msg.command == "start") {
        that.startEvaluation();
      }
      else if (msg.command == "stop") {
        that.stopEvaluation();
      }
      else if (msg.command == "queries") {
        if (that.started) {
          return;
        }
        if (msg.queries !== undefined) {
            //console.debug("parsing "+msg.queries);
            that.queries = JSON.parse(msg.queries);
            //console.debug("evaluation.queries is ", that.queries);

        }
      }
      ////console.debug('received evaluation message: ', event);

    }
    return true;
  },

  nextQuery: function() {
    return this.queries.pop() || null;
  },

  startEvaluation: function() {
    this.started = true;
    this.stats = {
      startTime: null,
      endTime: null,
      count: 0,
      time: 0,
      counts: {},
      times: {},
      peerContacts: 0,
      peers: {},
      bitmap: []
    };
    // convert to seconds
    this.stats.startTime = (new Date().getTime()) / 1000;

    //console.debug('starting testing');
    this.runQuery();
  },

  stopEvaluation: function() {
    this.started = false;
    //console.debug('stoping testing');
    // convert to seconds
    this.stats.endTime = (new Date().getTime()) / 1000;

    // report stats back to server
    this.socket.send(JSON.stringify(this.stats));
  },

  runQuery: function() {
    if (this.started == false) {
      return; // cut off the execution
    }
    var query = this.nextQuery();
    //console.debug("next query is ", query);
    if (query == null) {
      this.stopEvaluation();
      return;
    }
    // convert to seconds
    this.queryStartTime = (new Date().getTime()) / 1000
    database.exec(query, false, this.data_cb.bind(this), 
                                this.completion_cb.bind(this), 1);
  },

  data_cb: function(data, error) {
    if (error) {
      //console.debug("data_cb error! boo!", error);
    }
    // ignore the data...
  },

  completion_cb: function(data, error) {
    if (error) {
      //console.debug("completion_cb error! boo!", error);
    }
    else {
      //ignore data, start the next query
      // convert to seconds
      var endTime = (new Date().getTime()) / 1000;
      var elapsed = endTime - this.queryStartTime;
      this.stats.time += elapsed;

      var timeBin = Math.floor(this.queryStartTime);
      timeBin = timeBin - (timeBin % this.binSize);
     
      // times in bins 
      //
      /*
      if (this.stats.times[timeBin]) {
        this.stats.times[timeBin] += elapsed;
      }
      else {
        this.stats.times[timeBin] = elapsed;
      }
      */
      // counts in bins
      if (this.stats.counts[timeBin]) {
        this.stats.counts[timeBin]++;
      }
      else { 
        this.stats.counts[timeBin] = 1;
      }

      // count total number of queries run
      this.stats.count++;

      // count number of times we had to fetch pages from the server
      var hitServer = false;
      var hitPeer = false;
      if (server.serverDataRecv !== this.oldServerDataRecv) {
        hitServer = true;
      }
      if (node.peerDataRecv !== this.oldPeerDataRecv) {
        hitPeer = true;
      }

      if (hitServer) {
        this.stats.bitmap.push(2);
      }
      else if (hitPeer) {
        this.stats.bitmap.push(1); 
      }
      else {
        this.stats.bitmap.push(0);
      }

      this.oldServerDataRecv = server.serverDataRecv;
      this.oldPeerDataRecv = node.peerDataRecv;


      // be able to see that the evaluation is still running
      if (this.stats.count % 100 == 0) {
        $("#querybox").val(this.stats.count);
      }

      this.runQuery();
    }
  },
  
  countPeer: function(peer) {
    if (this.started && this.stats) {
      this.stats.peerContacts++;
      
    }
  }


}

evaluation.start();
