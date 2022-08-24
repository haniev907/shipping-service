const cdxUtil = require('../../../../src/cdx-util');
const base64Img = require('base64-img');
const fs = require("fs")

const imagesDir = './public/images';

const isSuperAdmin = (password) => password === 'hanievSuperAdmin818';

const collect = (config, cdx) => {
  return {
    addRestaurant: async (req, res) => {
      const {
        userId, body: {
          name, address, photo, telegramChatId, city, onlinePayMessage, customId, instagram, isBad, shortDescription
        },
      } = req;

      base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
        const pathArr = filepath.split('/')
        const fileName = pathArr[pathArr.length - 1];

        await cdx.db.restaurant.createRestaurant({
          name,
          address,
          photo: fileName,
          userId,
          telegramChatId,
          city,
          onlinePayMessage,
          customId,
          instagram,
          isBad,
          shortDescription,
        });

        res.json(new cdxUtil.UserResponseOK());
      });
    },

    editRestaurant: async (req, res) => {
      const {
        userId, body: {
          name,
          address,
          photo,
          telegramChatId,
          idRest,
          city,
          onlinePayMessage,
          customId,
          instagram,
          isBad,
          shortDescription,
          isClosed,
        },
      } = req;

      const edit = async (data) => {
        await cdx.db.restaurant.editRestaurant(idRest, {
          ...data,
          name,
          address,
          telegramChatId,
          city,
          onlinePayMessage,
          customId,
          instagram,
          isBad,
          shortDescription,
          isClosed,
        });
      };

      if (photo) {
        base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
          const pathArr = filepath.split('/')
          const fileName = pathArr[pathArr.length - 1];

          await edit({
            photo: fileName,
          });
  
          res.json(new cdxUtil.UserResponseOK());
        });
      } else {
        await edit();
      }

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
          idRestaurant, name, price, photo, category, weight, description
        },
      } = req;

      const listRests = await cdx.db.restaurant.getRestaurantsByUserId(userId);
      const isUserOwnerThisRest = listRests.some((currentRest) => currentRest.userId === userId && idRestaurant === String(currentRest.customId))

      if (!isUserOwnerThisRest) {
        throw new Error('User is not owner of this rest')
      }

      base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
        const pathArr = filepath.split('/')
        const fileName = pathArr[pathArr.length - 1];

        await cdx.db.dish.addDish({
          name, price: Number(price), photo: fileName, restId: idRestaurant, category, weight, description
        });

        res.json(new cdxUtil.UserResponseOK());
      });
    },

    editDish: async (req, res) => {
      const {
        userId, body: {
          name, price, photo, idDish, category, weight, description
        },
      } = req;

      if (photo) {
        base64Img.img(photo, imagesDir, Date.now(), async function(err, filepath) {
          const pathArr = filepath.split('/')
          const fileName = pathArr[pathArr.length - 1];
  
          await cdx.db.dish.editDish(idDish, {
            name, price: Number(price), photo: fileName, category, weight, description
          });
  
          res.json(new cdxUtil.UserResponseOK());
        });

        return;
      }

      await cdx.db.dish.editDish(idDish, {
        name, price: Number(price), category, weight, description
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
        const fullOrder = await cdx.db.wrapper.getFullOrder(order._id);

        ordersReadyForAdmin.push({
          address: fullOrder.address,
          phone: fullOrder.phone,
          status: fullOrder.status,
          items: fullOrder.items,
          message: cdxUtil.getStatusTestOfStatusNumber(order.status, order.shippingType),
          deliveryPrice: fullOrder.deliveryPrice,
          total: fullOrder.total,
          orderNumber: fullOrder.orderNumber,
          updatedTime: fullOrder.updatedAt,
          shippingType: fullOrder.shippingType,
          orderInfo: cdxUtil.orderMethods.getMessageOrderWeb(fullOrder, currentRest.name),
          _id: fullOrder._id
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
        throw new Error('User is not owner of this rest');
      }

      await cdx.db.order.upgradeOrder(orderId, status);

      res.json(new cdxUtil.UserResponseOK());
    }
  };
};

module.exports.init = (config, cdx) => collect(config, cdx);
