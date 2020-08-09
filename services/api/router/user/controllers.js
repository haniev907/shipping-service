const cdxUtil = require('@cdx/util');

const collect = (config, cdx) => {
  return {
    addRestaurant: async (req, res) => {
      const {
        userId, body: {
          name, address, photo
        },
      } = req;

      await cdx.db.restaurant.createRestaurant(name, address, photo, userId);

      res.json(new cdxUtil.UserResponseOK());
    },

    getMyRestaurants: async (req, res) => {
      const { userId } = req;

      const listRests = await cdx.db.restaurant.getRestaurantsByUserId(userId);

      res.json(new cdxUtil.UserResponse(listRests));
    },

    getMyRestaurant: async (req, res) => {
      const { userId, params: {id: idRest} } = req;

      const rest = await cdx.db.restaurant.getRestaurantByRestId(idRest);

      res.json(new cdxUtil.UserResponse(rest));
    },

    addDish: async (req, res) => {
      const {
        userId, body: {
          idRestaurant, name, price, photo
        },
      } = req;

      const listRests = await cdx.db.restaurant.getRestaurantsByUserId(userId);
      const isUserOwnerThisRest = listRests.some((currentRest) => currentRest.userId === userId && idRestaurant === String(currentRest._id))

      if (!isUserOwnerThisRest) {
        throw new Error('User is not owner of this rest')
      }

      await cdx.db.dish.addDish(name, Number(price), photo, idRestaurant);

      res.json(new cdxUtil.UserResponseOK());
    },

    getMyRestDishes: async (req, res) => {
      const {
        params: {
          restId,
        },
      } = req;

      const listDishes = await cdx.db.dish.getDishesByRestId(restId);

      res.json(new cdxUtil.UserResponse(listDishes));
    },

    getMyRestOrders: async (req, res) => {
      const {
        userId,
        params: {
          restId,
        },
      } = req;

      const currentRest = await cdx.db.restaurant.getRestaurantByRestId(restId);

      if (currentRest.userId !== userId) {
        throw new Error('User is not owner of this rest')
      }

      const listDishes = await cdx.db.order.getOrdersByRestId(restId);

      res.json(new cdxUtil.UserResponse(listDishes));
    },

    upgradeOrder: async (req, res) => {
      const {
        userId, body: {
          orderId, status
        },
      } = req;

      const currentOrder = await cdx.db.order.getOrderById(orderId);
      const currentRest = await cdx.db.restaurant.getRestaurantByRestId(currentOrder.restId);

      if (currentRest.userId !== userId) {
        throw new Error('User is not owner of this rest')
      }

      await cdx.db.order.upgradeOrder(orderId, status);

      const messageStatus = cdxUtil.getStatusTestOfStatusNumber(status);
      cdxUtil.sendNotificationToUser(currentOrder.phone, `
        eda-hh.ru! Ваш заказ ${messageStatus.toLowerCase()}. Спасибо, что вы с нами!
      `);

      res.json(new cdxUtil.UserResponseOK());
    }
  };
};

module.exports.init = (config, cdx) => collect(config, cdx);
