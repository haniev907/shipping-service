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

    removeRestaurant: async (req, res) => {
      const {
        userId, params: {
          id: idRest
        },
      } = req;

      const rest = await cdx.db.restaurant.getRestaurantByRestId(idRest);
      const isUserOwnerThisRest = rest.userId === userId

      if (!isUserOwnerThisRest) {
        throw new Error('User is not owner of this rest')
      }

      await cdx.db.restaurant.removeRestaurantByRestId(idRest);

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

    removeDish: async (req, res) => {
      const {
        userId, params: {
          id: idDish
        },
      } = req;

      const dish = await cdx.db.dish.getDishById(idDish);
      const rest = await cdx.db.restaurant.getRestaurantByRestId(dish.restId);
      const isUserOwnerThisRest = rest.userId === userId

      if (!isUserOwnerThisRest) {
        throw new Error('User is not owner of this rest')
      }

      await cdx.db.dish.removeDishById(idDish);

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

      const listOrders = await cdx.db.order.getOrdersByRestId(restId);
      const ordersReadyForAdmin = [];
      
      for (const order of listOrders) {
        const dishesWithFullInfo = [];

        for (const dish of order.items) {
          const currentDishWithFullInfo = await cdx.db.dish.getDishById(dish.id);

          if (!currentDishWithFullInfo) {
            dishesWithFullInfo.push({
              name: 'Неизвестно',
              price: 0,
              photo: '',
              quantity: dish.quantity,
              _id: dish._id,
            });
          } else {
            dishesWithFullInfo.push({
              ...currentDishWithFullInfo._doc,
              quantity: dish.quantity,
            });
          }
        }

        ordersReadyForAdmin.push({
          address: order.address,
          phone: order.phone,
          status: order.status,
          items: dishesWithFullInfo,
          message: cdxUtil.getStatusTestOfStatusNumber(order.status),
          total: dishesWithFullInfo.reduce((prev, cItem) => prev + cItem.price, 0),
          _id: order._id
        });
      }

      res.json(new cdxUtil.UserResponse(ordersReadyForAdmin));
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
