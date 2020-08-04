const validate = require('validate.js');
const cdxUtil = require('@cdx/util');

const moment = require('moment');

const collect = (config, cdx) => {
  return {
    getRestaurants: async (req, res) => {
      const { userId } = req;

      const listRests = await cdx.db.restaurant.getPublicRestaurants();

      res.json(new cdxUtil.UserResponse(listRests));
    },

    getRestaurant: async (req, res) => {
      const { userId, params: {id: idRest} } = req;

      const rest = await cdx.db.restaurant.getRestaurantByRestId(idRest);

      res.json(new cdxUtil.UserResponse(rest));
    },

    getMenu: async (req, res) => {
      const {
        params: {
          restId,
        },
      } = req;

      const listDishes = await cdx.db.dish.getDishesByRestId(restId);

      res.json(new cdxUtil.UserResponse(listDishes));
    },

    createOrder: async (req, res) => {
      const {
        userId, body: {
          publicUserToken, items, restId, address, phone
        },
      } = req;

      await cdx.db.order.createOrder(publicUserToken, items, restId, address, phone);

      res.json(new cdxUtil.UserResponseOK());
    },

    getMyOrders: async (req, res) => {
      const {
        params: {
          publicUserToken,
        },
      } = req;

      const orders = await cdx.db.order.getMyOrders(publicUserToken);
      const ordersReadyForClient = [];
      
      for (const order of orders) {
        const dishesWithFullInfo = [];

        for (const dish of order.items) {
          const currentDishWithFullInfo = await cdx.db.dish.getDishById(dish.id);
          dishesWithFullInfo.push(currentDishWithFullInfo);
        }

        ordersReadyForClient.push({
          address: order.address,
          phone: order.phone,
          status: order.status,
          message: cdxUtil.getStatusTestOfStatusNumber(order.status),
          total: dishesWithFullInfo.reduce((prev, cItem) => prev + cItem.price, 0)
        });
      }

      res.json(new cdxUtil.UserResponse(ordersReadyForClient));
    },
  };
};

module.exports.init = (config, cdx) => collect(config, cdx);
