const express = require('express');
const Controllers = require('./controllers');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User-oriented endpoints
 */

const router = express.Router();
const init = (config, cdx) => {
  const controllers = Controllers.init(config, cdx);

  router.use(express.json());

  router.get('/restaurants', controllers.getRestaurants);
  router.get('/restaurant/:id', controllers.getRestaurant);
  router.get('/menu/:restId', controllers.getMenu);

  router.post('/order', controllers.createOrder);
  router.get('/orders/:publicUserToken', controllers.getMyOrders);

  return router;
};


module.exports = (config, cdx) => init(config, cdx);
