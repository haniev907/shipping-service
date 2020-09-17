const mongoose = require('mongoose');

const MongoModelBase = require('./base');

/**
 * Order status types
 * 0 - заказ оформлен
 * 1 - заказ готовится
 * 2 - заказ едет
 * 3 - заказ доставлен
 */

class MongoOrder extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      publicUserToken: { type: String, required: true },
      items: [{
        id: { type: String, ref: 'Dish', required: true },
        quantity: { type: Number, required: true }
      }],
      restId: { type: String, ref: 'Restaurant', required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
      status: { type: Number, required: true, default: 0 },
      orderNumber: { type: Number, default: 0 },
      shippingType: { type: String, default: 'delivery' },
      city: { type: String, required: true },
      deliveryPrice: { type: Number, required: true, default: 0 },
      payType: { type: String, required: true, default: 'online' },
      total: { type: Number, required: true, default: 0 },
    }, { timestamps: true });

    this.Model = mongoose.model('Order', this.schema);
  }

  async createOrder({publicUserToken, items, restId, address, phone, orderNumber, shippingType, city, deliveryPrice, payType, total}) {
    const doc = new this.Model({
      publicUserToken, items, restId, address, phone, orderNumber, shippingType, city, deliveryPrice, payType, total
    });

    return doc.save();
  }
  
  async editOrder(idOrder, setData) {
    return await this.Model.updateOne(
      { _id: idOrder },
      { 
        $set: setData
      },
      { upsert: false },
    ).exec();
  }

  async getOrdersByRestId(restId) {
    return this.Model.find({
      restId
    }).exec();
  }

  async getOrderById(id) {
    return this.Model.findOne({
      _id: id
    }).exec();
  }

  async upgradeOrder(orderId, status) {
    await this.Model.updateOne(
      { _id: orderId },
      { 
        $set: {
          status
        }
      },
      { upsert: false },
    ).exec();

    return this.Model.findOne({
      _id: orderId
    }).exec();
  }

  async getMyOrders(publicUserToken) {
    return this.Model.find({
      publicUserToken
    }).exec();
  }

  async getAmountAllOrders() {
    return this.Model.countDocuments()
  }

  async getAll() {
    return this.Model.find().exec();
  }
}

module.exports = MongoOrder;
