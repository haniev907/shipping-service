const mongoose = require('mongoose');

const MongoModelBase = require('./base');

class MongoDish extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      name: { type: String, required: true },
      price: { type: Number, required: true },
      photo: { type: String },
      restId: {
        type: String,
        ref: 'Restaurant',
        required: true
      }
    }, { timestamps: true });

    this.Model = mongoose.model('Dish', this.schema);
  }

  async addDish(name, price, photo, restId) {
    const doc = new this.Model({
      name, price, photo, restId
    });

    return doc.save();
  }

  async removeDishById(idDish) {
    return this.Model.deleteOne({
      _id: idDish
    }).exec();
  }

  async getDishesByRestId(restId) {
    return this.Model.find({
      restId
    }).exec();
  }

  async getDishById(id) {
    return this.Model.findOne({
      _id: id
    }).exec();
  }
}

module.exports = MongoDish;
