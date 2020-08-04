const Server = require('./server');

class Web {
  constructor(config) {
    this.config = config;

    this.server = () => new Server(this.config);
  }
}

module.exports = Web;
