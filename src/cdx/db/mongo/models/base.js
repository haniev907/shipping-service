class MongoModelBase {
  constructor(config, connection) {
    this.config = config;
    this.connection = connection;
  }
}

module.exports = MongoModelBase;
