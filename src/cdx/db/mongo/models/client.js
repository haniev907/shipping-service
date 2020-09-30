const mongoose = require('mongoose');
const uuid = require('uuid');

const MongoModelBase = require('./base');

class MongoClient extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      _id: { type: String, default: uuid.v4 },
      phone: { type: String, required: true, unique: true },
      pin: { type: String, required: true },
      name: { type: String },
      address: { type: String },
      city: { type: String },
      lastTimeRemind: { type: Number }
    }, { timestamps: true });

    this.Model = mongoose.model('Client', this.schema);
  }

  async editClient(idClient, setData) {
    return await this.Model.updateOne(
      { _id: idClient },
      { 
        $set: setData
      },
      { upsert: false },
    ).exec();
  }

  async createClient(clientData) {
    const doc = new this.Model({
        ...clientData
    });

    return doc.save();
  }

  async getUserByPhone(phone) {
    return this.Model.findOne({ phone }).exec();
  }
}

module.exports = MongoClient;
