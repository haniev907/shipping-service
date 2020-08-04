const Auth = require('./auth');
const DB = require('./db');
const Web = require('./web');

class CDX {
  constructor(config) {
    this.config = config;

    this.db = new DB(this.config);
    this.auth = new Auth(this.db, this.config);
    this.web = new Web(this.config);
  }
}

module.exports = config => new CDX(config);
