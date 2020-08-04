const mongoose = require('mongoose');
const uuid = require('uuid');

const MongoModelBase = require('./base');

class MongoDish extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      _id: { type: String, default: uuid.v4 },
      email: { type: String, required: true, index: true, unique: true, },
      key: { type: String, required: true }
    }, { timestamps: true });

    this.Model = mongoose.model('User', this.schema);
  }

  async createUser(email, key) {
    const doc = new this.Model({
      email, key,
    });

    return doc.save();
  }

  async getUserByEmail(email) {
    return this.Model.findOne({ email }).exec();
  }
}

module.exports = MongoDish;
