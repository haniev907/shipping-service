const mongoose = require('mongoose');

class MongoDBConnection {
  constructor(uri) {
    this.db = mongoose.connect(uri, { useNewUrlParser: true });
  }

  async close() {
    return (await this.db).disconnect();
  }
}

module.exports = MongoDBConnection;
