const Sentry = require('@sentry/node');

module.exports = {
  init: config => Sentry.init(config.sentry),
  captureException: err => Sentry.captureException(err),
};
