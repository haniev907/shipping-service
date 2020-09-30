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
  router.post('/order/confirm', controllers.confirmOrder);
  router.post('/order/remind-pin', controllers.remindPin);
  router.get('/orders/:publicUserToken', controllers.getMyOrders);
  router.post('/order/full', controllers.getFullOrder);

  router.post('/order/cancel', controllers.cancelOrder);

  router.get('/cities', controllers.getCities);
  router.post('/delivery/price', controllers.getPriceDelivery);

  router.get('/profile/:publicUserToken', controllers.getInfoClient);
  router.post('/profile/edit', controllers.editInfoClient);
  router.post('/profile/auth', controllers.authClient);

  router.post('/get-discount', controllers.getDiscount);

  return router;
};


module.exports = (config, cdx) => init(config, cdx);
