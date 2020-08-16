const actions = {
  getFullOrder: async (cdx, order) => {
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

    return {
      ...order._doc,
      items: dishesWithFullInfo
    };
  },
};

module.exports = actions;
