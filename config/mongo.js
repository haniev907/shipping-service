const cdxUtil = require('../src/cdx-util');

const config = {};

config.enabled = cdxUtil.envFlag('MONGO_ENABLED');
config.extMarketParser = cdxUtil.envFlag('EXT_MARKET_PARSER');

if (config.enabled) {
  config.uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eduzaberu-dev';
}

module.exports = config;
