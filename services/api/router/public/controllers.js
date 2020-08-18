const cdxUtil = require('@cdx/util');

const collect = (config, cdx) => {
  const actions = {
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

      const orderNumber = await cdx.db.order.getAmountAllOrders();
      const order = await cdx.db.order.createOrder(publicUserToken, items, restId, address, phone, orderNumber);
      const fullOrder = await cdxUtil.orderDb.getFullOrder(cdx, order);

      const rest = await cdx.db.restaurant.getRestaurantByRestId(restId);

      cdxUtil.sendTelegramMessageToAdmin(rest.telegramChatId, {
        order: fullOrder
      });

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
        const fullOrder = await cdxUtil.orderDb.getFullOrder(cdx, order);

        ordersReadyForClient.push({
          address: order.address,
          phone: order.phone,
          status: order.status,
          message: cdxUtil.getStatusTestOfStatusNumber(order.status),
          total: fullOrder.items.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), 0),
          orderNumber: order.orderNumber,
          _id: order._id
        });
      }

      res.json(new cdxUtil.UserResponse(ordersReadyForClient));
    },

    cancelOrder: async (req, res) => {
      const {
        body: {
          orderId, publicUserToken
        },
      } = req;

      const currentOrder = await cdx.db.order.getOrderById(orderId);
      const rest = await cdx.db.restaurant.getRestaurantByRestId(currentOrder.restId);

      if (currentOrder.publicUserToken !== publicUserToken) {
        throw new Error('User is not owner of this order')
      }

      await cdx.db.order.upgradeOrder(orderId, 4);

      cdxUtil.sendTelegramAnyMessageToAdmin(rest.telegramChatId, `
        Заказ №${currentOrder.orderNumber} отменен клиентом.
      `);

      res.json(new cdxUtil.UserResponseOK());
    }
  };

  return actions
};

module.exports.init = (config, cdx) => collect(config, cdx);
