const userRouter = require('./user');
const publicRouter = require('./public');
const adminRouter = require('./admin');

module.exports = (config, cdx) => ({
  userRouter: userRouter(config, cdx),
  publicRouter: publicRouter(config, cdx),
  adminRouter: adminRouter(config, cdx)
});
