const cdxUtil = require('@cdx/util');
const base64Img = require('base64-img');
const fs = require("fs")

const imagesDir = './public/images';

const collect = (config, cdx) => {
  return {
    addRestaurant: async (req, res) => {
      const {
        userId, body: {
          name, address, photo, telegramChatId, city
        },
      } = req;

      base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
        const pathArr = filepath.split('/')
        const fileName = pathArr[pathArr.length - 1];

        await cdx.db.restaurant.createRestaurant({name, address, photo: fileName, userId, telegramChatId, city});

        res.json(new cdxUtil.UserResponseOK());
      });
    },

    editRestaurant: async (req, res) => {
      const {
        userId, body: {
          name, address, photo, telegramChatId, idRest, city
        },
      } = req;

      if (photo) {
        base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
          const pathArr = filepath.split('/')
          const fileName = pathArr[pathArr.length - 1];
  
          await cdx.db.restaurant.editRestaurant(idRest, {
            name, address, photo: fileName, telegramChatId, city
          });
  
          res.json(new cdxUtil.UserResponseOK());
        });

        return;
      }

      await cdx.db.restaurant.editRestaurant(idRest, {
        name, address, telegramChatId, city
      });

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

      base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
        const pathArr = filepath.split('/')
        const fileName = pathArr[pathArr.length - 1];

        await cdx.db.dish.addDish(name, Number(price), fileName, idRestaurant);

        res.json(new cdxUtil.UserResponseOK());
      });
    },

    editDish: async (req, res) => {
      const {
        userId, body: {
          name, price, photo, idDish
        },
      } = req;

      if (photo) {
        base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
          const pathArr = filepath.split('/')
          const fileName = pathArr[pathArr.length - 1];
  
          await cdx.db.dish.editDish(idDish, {
            name, price: Number(price), photo: fileName
          });
  
          res.json(new cdxUtil.UserResponseOK());
        });

        return;
      }

      await cdx.db.dish.editDish(idDish, {
        name, price: Number(price)
      });

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

      fs.unlink(`${imagesDir}/${dish.photo}`, function(err) {
        if (err) {
          throw err
        }
      });

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
          message: cdxUtil.getStatusTestOfStatusNumber(order.status, order.shippingType),
          total: dishesWithFullInfo.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), 0),
          orderNumber: order.orderNumber,
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
