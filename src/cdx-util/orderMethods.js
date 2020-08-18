const statuses = require('./statuses');

const getMessageOrder = (order) => (
  `Мы получили новый заказ! Номер заказа: ${order.orderNumber}. Телефон клиента: ${order.phone}, адрес: ${order.address}`
);

const getStatusTestOfStatusNumber = (statusNumber) => {
  return statuses[statusNumber] || 'Что-то не так с заказом :(';
};

const getMenuListHtml = (items) => items.map((currentItem) => (
`
${currentItem.name} ${currentItem.quantity > 1 ? `${currentItem.quantity} штук` : ''}`
))

const getHtmlMessageOrder = (order, restName) => (`
Заказ <b>№${order.orderNumber}</b> (${restName})

Формат: <b>${order.shippingType === 'pickup' ? 'Самовывоз' : 'Доставка'}</b>

Телефон клиента: <i>${order.phone}</i>

Адрес клиента: <b>${order.address}</b>

Текущий статус: <b>${getStatusTestOfStatusNumber(order.status)}</b>

Меню:
${getMenuListHtml(order.items)}

Всего: ${order.items.reduce((prev, cItem) => prev + (cItem.price * cItem.quantity), 0)} Р

Последнее время обновления: ${new Date()}

Выставить статус:
`);

module.exports = {
  getMessageOrder,
  getHtmlMessageOrder,
  getStatusTestOfStatusNumber
};
