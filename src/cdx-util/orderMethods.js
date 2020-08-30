const statuses = require('./statuses');

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

const getHtmlMessageOrder = (order, restName) => (`
Заказ <b>№${order.orderNumber}</b> (${restName})

Формат: <b>${order.shippingType === 'pickup' ? 'Самовывоз' : 'Доставка'}</b>

Телефон клиента: <b><i>${order.phone}</i></b>

Адрес клиента: <b>${order.address}</b>

Текущий статус: <b>${getStatusTestOfStatusNumber(order.status, order.shippingType)}</b>

Меню (${order.total - order.deliveryPrice} Р):
${getMenuListHtml(order.items)}

Доставка: ${order.deliveryPrice} Р
Всего: ${order.total} Р

Оплата: <b>${order.payType === 'online' ? 'Перевод онлайн' : 'Наличными'}</b>

Последнее время обновления: ${new Date()}

Выставить статус:
`);

module.exports = {
  getMessageOrder,
  getHtmlMessageOrder,
  getStatusTestOfStatusNumber
};
