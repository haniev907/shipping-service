const cdxUtil = require('@cdx/util');

module.exports = (db) => {
  return {
    getFullOrder: async (orderId) => {
      const order = await db.order.getOrderById(orderId);

      const dishesWithFullInfo = [];

      for (const dish of order.items) {
        const currentDishWithFullInfo = await db.dish.getDishById(dish.id);

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

      return {
        ...order._doc,
        total: dishesWithFullInfo.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), order.deliveryPrice),
        items: dishesWithFullInfo
      };
    }
  };
};
