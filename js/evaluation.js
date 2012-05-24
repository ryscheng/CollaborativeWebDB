var evaluation = {
  socket: null,
  started: false,
  myTableCreated: false, 
  
  binSize: 5, // bin size in seconds of timeseries 
  stats: {},

  write: function(obj) {
    if (!this.socket) {
      return false;
    }
    return this.socket.send(JSON.stringify({"payload": obj}));
  },

  start: function() { 
    //console.debug('creating websocket for eval');
    var url = "ws://" + location.host + "/evalWS";
    if (!window.WebSocket) {
      return false;
    }
    this.socket = new WebSocket(url);
    //console.debug(this.socket);

    var that = this;
    this.socket.onmessage = function(event) {
      var msg = JSON.parse(event.data);
      if (msg.command == "start") {
        that.startEvaluation();
      }
      else if (msg.command == "stop") {
        that.stopEvaluation();
      }
      //console.debug('received evaluation message: ', event);

    }
    return true;
  },

  nextQuery: function() {
    return "SELECT * FROM my_table";
  },

  createMyTable: function() {
    // install our own table to run test queries over
    var testCreateQuery = "create table my_table (id int, test text); insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1, 'text');    insert into my_table VALUES(1.5, 'text');    insert into my_table VALUES(2, 'text');    insert into my_table VALUES(2, 'text');    insert into my_table VALUES(2, 'text');    insert into my_table VALUES(2, 'text');    insert into my_table VALUES(2, 'text');";

    var that = this;
    database.exec(
       testCreateQuery, false,
       function(data, error) {},
       function(data, error) { 
         that.myTableCreated = true; 
         console.debug("my_table created"); 
         that.startEvaluation(); }
    );
  }, 

  startEvaluation: function() {
    if (!this.myTableCreated) {
      this.createMyTable();
      return;
    }
    this.started = true;
    this.stats = {
      count: 0,
      time: 0,
      counts: {},
      times: {}
    };
    console.debug('starting testing');
    this.runQuery();
  },

  stopEvaluation: function() {
    this.started = false;
    console.debug('stoping testing');

    // report stats back to server
    this.socket.send(JSON.stringify(this.stats));
  },

  runQuery: function() {
    if (this.started == false) {
      return; // cut off the execution
    }
    var query = this.nextQuery();
    if (query == null) {
      this.stopEvaluation();
      return;
    }
    this.stats.count++;
    this.startTime = new Date().getTime();
    database.exec(query, false, this.data_cb.bind(this), 
                                this.completion_cb.bind(this), 1);
  },

  data_cb: function(data, error) {
    if (error) {
      console.debug("data_cb error! boo!", error);
    }
    // ignore the data...
  },

  completion_cb: function(data, error) {
    if (error) {
      console.debug("completion_cb error! boo!", error);
    }
    else {
      //ignore data, start the next query
      var endTime = new Date().getTime();
      var elapsed = endTime - this.startTime;
      this.stats.time += elapsed;

      this.runQuery();
    }
  }

}

evaluation.start();
