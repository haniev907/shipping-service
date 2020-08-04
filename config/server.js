const config = {};

config.express = {
  host: process.env.SERVER_HOST || 'localhost',
  port: process.env.SERVER_PORT || 5000,
  CORSOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
