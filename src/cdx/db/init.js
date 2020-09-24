const cdxUtil = require('@cdx/util');

const MongoConnection = require('./mongo/connection');

const MongoDish = require('./mongo/models/dish');
const MongoRestaurant = require('./mongo/models/restaurant');
const MongoUser = require('./mongo/models/user');
const MongoOrder = require('./mongo/models/order');
const MongoClient = require('./mongo/models/client');

const Wrapper = require('./wrapper');

const logger = new cdxUtil.Logging();

class DB {
  constructor(config) {
    this.config = config;

    const mongoConnection = this.config.mongo.enabled
      ? new MongoConnection(this.config.mongo.uri)
      : null;

    const MPMongoConnection = this.config.mongo.extMarketParser
      ? new MongoConnection(this.config.mongo.mpUri)
      : null;

    const disabledMongoDB = new Proxy({}, {
      get: () => {
        throw new Error('To be able to use the MongoDB class, set MONGO_ENABLED=1');
      },
    });

    const registerModel = (Model, enabled, ...args) => {
      if (!enabled) {
        return disabledMongoDB;
      }

      const model = new Model(...args);

      model.Model.on('index', (err) => {
        if (!err) return;
        logger.error(
          'index',
          { message: `Index error in ${Model.name}`, error: err },
          config.logging.db.mongo,
        );
        // TODO: throw Error(err);
      });

      return model;
    };

    const registerMongoModel = Model => registerModel(
      Model,
      this.config.mongo.enabled, this.config,
      mongoConnection,
    );

    this.dish = registerMongoModel(MongoDish);
    this.restaurant = registerMongoModel(MongoRestaurant);
    this.user = registerMongoModel(MongoUser);
    this.order = registerMongoModel(MongoOrder);
    this.client = registerMongoModel(MongoClient);

    this.wrapper = Wrapper({
      order: this.order,
      dish: this.dish,
      user: this.user,
      restaurant: this.restaurant,
      client: this.client
    });
  }
}

module.exports = DB;
