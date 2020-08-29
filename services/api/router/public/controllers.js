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
          publicUserToken, items, restId, address, phone, shippingType
        },
      } = req;

      const orderNumber = await cdx.db.order.getAmountAllOrders();
      const order = await cdx.db.order.createOrder(publicUserToken, items, restId, address, phone, orderNumber, shippingType);
      const fullOrder = await cdxUtil.orderDb.getFullOrder(cdx, order);

      const rest = await cdx.db.restaurant.getRestaurantByRestId(restId);

      if (rest.telegramChatId) {
        cdxUtil.sendTelegramMessageToAdmin(rest.telegramChatId, rest.name, {
          order: fullOrder
        });
      }

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
          message: cdxUtil.getStatusTestOfStatusNumber(order.status, order.shippingType),
          total: fullOrder.items.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), 0),
          orderNumber: order.orderNumber,
          shippingType: order.shippingType,
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

      if (rest.telegramChatId) {
        cdxUtil.sendTelegramAnyMessageToAdmin(rest.telegramChatId, `
          Заказ №${currentOrder.orderNumber} отменен клиентом. (${rest.name})
        `);
      }

      res.json(new cdxUtil.UserResponseOK());
    },

    getCities: async (req, res) => {
      const cities = cdxUtil.delivery.getCities();

      res.json(new cdxUtil.UserResponse(cities));
    },

    getPriceDelivery: async (req, res) => {
      const {
        body: {
          a, b
        },
      } = req;

      const price = cdxUtil.delivery.getPriceDelivery(a, b);

      res.json(new cdxUtil.UserResponse(price));
    },
  };

  return actions
};

module.exports.init = (config, cdx) => collect(config, cdx);
