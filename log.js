var log = {
  start: function(vis) {
    this.el = document.createElement("pre");
    this.el.id = "webp2p_log";
    if (vis) {
      document.body.appendChild(this.el);
    }
  },
  write: function(msg) {
    $(this.el).append(msg + "\n\r");
  }
};
