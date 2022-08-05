const cdxUtil = require('../../cdx-util');

module.exports = (db) => {
  const actions = {
    getFullDishes: async (dishes) => {
      const dishesWithFullInfo = [];

      for (const dish of dishes) {
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
        totalPrice: dishesWithFullInfo.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), 0),
        items: dishesWithFullInfo
      };
    },

    getFullOrder: async (orderId) => {
      const order = await db.order.getOrderById(orderId);
      const dishesWithFullInfo = await actions.getFullDishes(order.items);
      const items = dishesWithFullInfo.items;

      return {
        total: dishesWithFullInfo.totalPrice + order.deliveryPrice,
        ...order._doc,
        items: items
      };
    },
  };

  return actions;
};
