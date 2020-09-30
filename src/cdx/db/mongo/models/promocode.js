const mongoose = require('mongoose');
const uuid = require('uuid');

const MongoModelBase = require('./base');

class MongoPromocode extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      _id: { type: String, default: uuid.v4 },
      sign: { type: String, required: true, uniq: true },
      type: { type: String, default: 'absolute' },
      value: { type: Number, required: true },
      charge: { type: Number, required: true },
      maxValue: { type: Number }
    }, { timestamps: true });

    this.Model = mongoose.model('Promocode', this.schema);
  }

  async editPromocode(idPromocode, setData) {
    return await this.Model.updateOne(
      { _id: idPromocode },
      { 
        $set: setData
      },
      { upsert: false },
    ).exec();
  }

  async createPromocode(promocodeData) {
    const doc = new this.Model({
      ...promocodeData
    });

    return doc.save();
  }

  async check(sign) {
    const currentPromocode = await this.Model.findOne({ sign }).exec();

    if (!currentPromocode || currentPromocode.charge === 0) {
      return null;
    }

    return currentPromocode;
  }

  async getAll() {
    return this.Model.find().exec();
  }
}

module.exports = MongoPromocode;
