const cdxUtil = require('@cdx/util');
const { cli } = require('winston/lib/winston/config');

const getRandomNumber = () => Math.ceil(Math.random() * 9);
const getRandomPin = () => [0,0,0,0].reduce((prev, currNumber) => prev + getRandomNumber(), ''); 

const getPublicToken = (phone, pin) => `${phone}-${pin}`;
const getPhonePinOfToken = (token) => {
  const [phone, pin] = token.split('-');

  return {
    phone, pin
  };
};

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
        body: {
          publicUserToken, items, restId, address, phone, shippingType, city, payType
        },
      } = req;

      let isConfirmed = false;

      const {tokenPhone, pin}  = getPhonePinOfToken(publicUserToken);

      if (pin) {
        const client = await cdx.db.client.getUserByPhone(phone);

        if (client && client.pin) {
          isConfirmed = client.pin === pin;
        }
      }

      const orderNumber = await cdx.db.order.getAmountAllOrders();
      const rest = await cdx.db.restaurant.getRestaurantByRestId(restId);

      const deliveryPrice = cdxUtil.delivery.getPriceDelivery(rest.city, city);
      const fullItemsData = await cdx.db.wrapper.getFullDishes(items);
      const totalPrice = fullItemsData.totalPrice + deliveryPrice;

      const order = await cdx.db.order.createOrder({
        publicUserToken, items, restId, address, phone, orderNumber, shippingType, city, deliveryPrice, payType,
        total: Number(totalPrice), confirmed: isConfirmed
      });
      const fullOrder = await cdx.db.wrapper.getFullOrder(order._id);      

      cdxUtil.sendTelegramMessageToAdmin(isConfirmed ? rest.telegramChatId : null, rest.name, {
        order: fullOrder
      });

      if (!isConfirmed) {
        const newClientPin = getRandomPin();
        const client = await cdx.db.client.createClient({
          phone, pin: newClientPin, lastTimeRemind: Date.now()
        });

        cdxUtil.sendNotificationToUser(phone, `@eda.house | Ваш пин-номер ${newClientPin}, подтвердите свой заказ на сайте.`);
      }

      res.json(new cdxUtil.UserResponseOK());
    },

    confirmOrder: async (req, res) => {
      const {
        body: {
          orderId, pin, phone
        },
      } = req;

      const client = await cdx.db.client.getUserByPhone(phone);
      const isConfirmed = client.pin === pin;

      if (isConfirmed) {
        const order = await cdx.db.order.getOrderById(orderId);
        const rest = await cdx.db.restaurant.getRestaurantByRestId(order.restId);
        const publicUserToken = getPublicToken(phone, pin);

        await cdx.db.order.editOrder(orderId, {
          confirmed: true,
          publicUserToken
        });

        cdxUtil.sendTelegramMessageToAdmin(rest.telegramChatId, rest.name, {
          order: fullOrder
        });

        res.json(new cdxUtil.UserResponse(publicUserToken));

        return;
      }

      res.json(new cdxUtil.UserResponse({
        error: {
          needConfirmId: fullOrder._id
        }
      }));
    },

    remindPin: async (req, res) => {
      const {
        params: {
          phone,
        },
      } = req;

      const client = await cdx.db.client.getUserByPhone(phone);

      if (!client) {
        return res.json(new cdxUtil.UserResponse({
          error: {
            message: 'User is not defined'
          }
        }));
      }

      const nowTime = Date.now();
      const isBan = nowTime - client.lastTimeRemind < (5 * 1000 * 60);

      if (isBan) {
        return res.json(new cdxUtil.UserResponse({
          error: {
            message: 'Too many requests'
          }
        }));
      }

      cdxUtil.sendNotificationToUser(phone, `@eda.house | Ваш пин-номер ${client.pin}, подтвердите свой заказ на сайте.`);

      await cdx.db.client.editClient(client._id, {
        lastTimeRemind: nowTime
      });

      res.json(new cdxUtil.UserResponseOk());
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
        const fullOrder = await cdx.db.wrapper.getFullOrder(order._id);

        ordersReadyForClient.push({
          address: order.address,
          phone: order.phone,
          status: order.status,
          message: cdxUtil.getStatusTestOfStatusNumber(order.status, order.shippingType),
          deliveryPrice: fullOrder.deliveryPrice,
          total: fullOrder.total,
          orderNumber: order.orderNumber,
          shippingType: order.shippingType,
          _id: order._id,
          confirmed: order.confirmed
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

    authClient: async () => {
      const {
        body: {
          phone, pin
        },
      } = req;

      const client = await cdx.db.client.getUserByPhone(phone);

      if (!client || pin !== client.pin) {
        return res.json(new cdxUtil.UserResponse({
          error: {
            message: 'User is not defined'
          }
        }));
      }

      const publicUserToken = getPublicToken(phone, pin);;

      res.json(new cdxUtil.UserResponse(publicUserToken));
    },

    getInfoClient: async () => {
      const {
        body: {
          publicUserToken
        },
      } = req;

      const {phone, pin}  = getPhonePinOfToken(publicUserToken);

      const client = await cdx.db.client.getUserByPhone(phone); 

      if (!client || pin !== client.pin) {
        return res.json(new cdxUtil.UserResponse({
          error: {
            message: 'User is not defined'
          }
        }));
      }

      res.json(new cdxUtil.UserResponse(client));
    },

    editInfoClient: async () => {
      const {
        body: {
          publicUserToken, data
        },
      } = req;

      const {phone, pin}  = getPhonePinOfToken(publicUserToken);

      const client = await cdx.db.client.getUserByPhone(phone); 

      if (!client || pin !== client.pin) {
        return res.json(new cdxUtil.UserResponse({
          error: {
            message: 'User is not defined'
          }
        }));
      }

      await cdx.db.client.editClient(client._id, data); 

      res.json(new cdxUtil.UserResponseOk());
    },
  };

  return actions
};

module.exports.init = (config, cdx) => collect(config, cdx);
