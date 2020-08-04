const userRouter = require('./user');
const publicRouter = require('./public');

module.exports = (config, cdx) => ({
  userRouter: userRouter(config, cdx),
  publicRouter: publicRouter(config, cdx)
});
