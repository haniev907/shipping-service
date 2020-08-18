const express = require('express');
const Controllers = require('./controllers');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User-oriented endpoints, authentication is necessary
 */

const router = express.Router();
const init = (config, cdx) => {
  const controllers = Controllers.init(config, cdx);

  router.use(express.json());
  router.use(cdx.auth.createMiddleware(true));

  router.get('/restaurants', controllers.getMyRestaurants);
  router.get('/restaurant/:id', controllers.getMyRestaurant);
  router.post('/restaurant', controllers.addRestaurant);
  router.delete('/restaurant/:id', controllers.removeRestaurant);
  router.post('/restaurant/edit', controllers.editRestaurant);

  router.get('/dishes/:restId', controllers.getMyRestDishes);
  router.post('/dish', controllers.addDish);
  router.delete('/dish/:id', controllers.removeDish);
  router.post('/dish/edit', controllers.editDish);

  router.get('/orders/:restId', controllers.getMyRestOrders);
  router.post('/order/upgrade', controllers.upgradeOrder);

  return router;
};


module.exports = (config, cdx) => init(config, cdx);
