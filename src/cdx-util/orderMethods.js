const statuses = require('./statuses');

const getMessageOrder = (order) => (
  `Мы получили новый заказ! Номер заказа: ${order.orderNumber}. Телефон клиента: ${order.phone}, адрес: ${order.address}`
);

const getStatusTestOfStatusNumber = (statusNumber) => {
  return statuses[statusNumber] || 'Что-то не так с заказом :(';
};

const getMenuListHtml = (items) => items.map((currentItem) => (
  `${currentItem.name} ${currentItem.quantity}x, ${(currentItem.price * currentItem.quantity)} Р`
))

const getHtmlMessageOrder = (order) => (`
Заказ №${order.orderNumber} 
Телефон клиента: <i>${order.phone}</i>
Адрес клиента: ${order.address} 
Текущий статус: <b>${getStatusTestOfStatusNumber(order.status)}</b>

Меню:
${getMenuListHtml(order.items)}

Выставить статус:
`);

module.exports = {
  getMessageOrder,
  getHtmlMessageOrder,
  getStatusTestOfStatusNumber
};
