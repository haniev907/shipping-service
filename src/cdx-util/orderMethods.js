const moment = require('moment');

const statuses = require('./statuses');
const delivery = require('./delivery');

const getMessageOrder = (order) => (
  `Мы получили новый заказ! Номер заказа: ${order.orderNumber}. Телефон клиента: ${order.phone}, адрес: ${order.address}`
);

const getStatusTestOfStatusNumber = (statusNumber, shippingType) => {
  if (statusNumber === 2 && shippingType === 'pickup') {
    return 'Готов, приходите забирать'
  }

  return statuses[statusNumber] || 'Что-то не так с заказом :(';
};

const getMenuListHtml = (items) => items.map((currentItem) => (
`${currentItem.name} ${currentItem.quantity > 1 ? `(${currentItem.quantity} штук)` : ''}`
)).join(`
`)

const getHtmlMessageOrder = (order, restName) => {
  return (`
Заказ <b>№${order.orderNumber}</b> (${restName})

Формат: <b>${order.shippingType === 'pickup' ? 'Самовывоз' : 'Доставка'}</b>
Телефон клиента: <b><i>${order.phone}</i></b>
Адрес клиента: <b>${delivery.getCities()[(order.city)]}, ${order.address}</b>
Текущий статус: <b>${getStatusTestOfStatusNumber(order.status, order.shippingType)}</b>

Меню (${order.total - order.deliveryPrice} Р):
${getMenuListHtml(order.items)}

Доставка: ${order.deliveryPrice} Р
Скидка: ${order.discount} Р
Всего: ${order.total - order.discount} Р
Оплата: <b>${order.payType === 'online' ? 'Перевод онлайн' : 'Наличными'}</b>

upd: ${moment().format('h:mm:ss')}
  `);
};

module.exports = {
  getMessageOrder,
  getHtmlMessageOrder,
  getStatusTestOfStatusNumber
};
