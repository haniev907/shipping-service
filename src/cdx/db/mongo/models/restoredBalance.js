const mongoose = require('mongoose');
const moment = require('moment');

const MongoModelBase = require('./base');

class MongoRestoredBalance extends MongoModelBase {
  constructor(config, connection) {
    super(config, connection);

    this.schema = new mongoose.Schema({
      keyId: { type: String, ref: 'APIKey' },
      timestamp: { type: Date },
      balances: { type: mongoose.Schema.Types.Mixed },
      done: { type: Boolean },
    }, { timestamps: true });

    this.schema.index({ keyId: 1, timestamp: 1 }, { unique: true });

    this.Model = mongoose.model('RestoredBalance', this.schema);
  }

  async markupGaps(keyId, beginMoment) {
    const to = moment.utc().startOf('hour');
    const from = moment.max([
      moment.utc().subtract(1, 'year').startOf('hour'),
      beginMoment,
    ]);

    const timestamps = [];
    for (const cur = moment.utc(from); cur.isBefore(to); cur.add(1, 'hour')) {
      timestamps.push(moment.utc(cur).toDate());
    }

    const bulkOps = timestamps.map(timestamp => ({
      updateOne: {
        filter: { keyId, timestamp },
        update: {
          $setOnInsert: { done: false },
        },
        upsert: true,
        setOnInsert: {},
      },
    }));

    if (bulkOps.length === 0) {
      return Promise.resolve();
    }

    return this.Model.collection.bulkWrite(bulkOps);
  }

  async setBalancesMany(keyId, payload) {
    const bulkOps = payload.map(({ timestamp, balances }) => ({
      updateOne: {
        filter: { keyId, timestamp },
        update: {
          $set: { balances, done: true },
        },
        upsert: true,
      },
    }));

    return this.Model.collection.bulkWrite(bulkOps);
  }

  async getLast(keyId) {
    return this.Model
      .findOne(
        { keyId, done: true },
        { _id: 0 },
      )
      .sort({ timestamp: -1 })
      .exec();
  }

  async getFirst(keyId) {
    return this.Model
      .findOne(
        { keyId, done: true },
        { _id: 0 },
      )
      .sort({ timestamp: 1 })
      .exec();
  }

  async get(keyId, timestamp) {
    return this.Model.findOne({ keyId, timestamp }).exec();
  }

  async getIntervalByDays(keyId, from, to, limit = 0) {
    return this.Model.aggregate()
      .match({ keyId, timestamp: { $gte: from, $lte: to } })
      .project({
        timePart: { $dateToString: { format: '%H:%M:%S:%L', date: '$timestamp' } },
        timestamp: 1,
        balances: 1,
        done: 1,
        keyId: 1,
      })
      .match({ timePart: '23:00:00:000' })
      .limit(limit)
      .sort({ timestamp: 1 });
  }

  async getInterval(keyId, from, to, limit = 0) {
    return this.Model.find(
      { keyId, timestamp: { $gte: from, $lte: to } },
      { _id: 0 },
      { sort: { timestamp: 1 }, limit },
    ).exec();
  }

  async getLastGap(keyId, fromMoment, mxAmount = 4, mxUnit = 'week') {
    const firstIncomplete = await this.Model
      .findOne(
        { keyId, done: false, timestamp: { $gte: fromMoment.toDate() } },
        { _id: 0, timestamp: 1 },
      )
      .sort({ timestamp: 1 })
      .exec();

    if (firstIncomplete === null) return null;

    const nextCompleted = await this.Model
      .findOne(
        { keyId, done: true, timestamp: { $gt: firstIncomplete.timestamp } },
        { _id: 0, timestamp: 1 },
      )
      .sort({ timestamp: 1 })
      .exec();

    if (nextCompleted === null) return null;
    const nextCompletedMoment = moment.utc(nextCompleted.timestamp);

    const mxFrom = moment.max(
      moment.utc(nextCompletedMoment).subtract(mxAmount, mxUnit),
      moment.utc(firstIncomplete.timestamp),
    );

    return {
      from: moment.utc(mxFrom).toDate(),
      to: moment.utc(nextCompletedMoment).toDate(),
    };
  }
}

module.exports = MongoRestoredBalance;
