const mongoose = require('mongoose');

const MongoModelBase = require('./base');

class MongoRestaurant extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      name: { type: String, required: true },
      address: { type: String, required: true },
      photo: { type: String },
      userId: { type: String, ref: 'User', required: true },
      telegramChatId: { type: String, required: true },
      city: { type: String, required: true },
      onlinePayMessage: { type: String },
      isLavka: { type: Boolean },
      fixedDeliveryPrice: { type: Number },
      fixedRegion: { type: String },
      customId: { type: String, unique: true },
      instagram: { type: String },
      isBad: { type: Boolean },
      shortDescription: { type: String },
      isClosed: { type: Boolean }
    }, { timestamps: true });

    this.Model = mongoose.model('Restaurant', this.schema);
  }

  async createRestaurant({name, address, photo, userId, telegramChatId, city, onlinePayMessage, customId, instagram}) {
    const doc = new this.Model({
      name, address, photo, userId, telegramChatId, city, onlinePayMessage, customId, instagram
    });

    return doc.save();
  }

  async editRestaurant(idRest, setData) {
    return await this.Model.updateOne(
      { customId: idRest },
      { 
        $set: setData
      },
      { upsert: false },
    ).exec();
  }

  async getRestaurantsByUserId(userId) {
    return this.Model.find({
      userId
    }).exec();
  }

  async removeRestaurantByRestId(restId) {
    return this.Model.deleteOne({
      customId: restId
    }).exec();
  }

  async getRestaurantByRestId(restId) {
    return this.Model.findOne({
      customId: restId,
    }).exec();
  }

  async getPublicRestaurants() {
    return this.Model.find().exec();
  }
}

module.exports = MongoRestaurant;
