const moment = require('moment');

const statuses = require('./statuses');
const delivery = require('./delivery');
const { format } = require('winston');

const getMessageOrder = (order) => (
  `Мы получили новый заказ! Номер заказа: ${order.orderNumber}. Телефон клиента: ${order.phone}, адрес: ${order.address}`
);

const getStatusTestOfStatusNumber = (statusNumber, shippingType) => {
  if (statusNumber === 2 && shippingType === 'pickup') {
    return 'Готов, приходите забирать'
  }

  return statuses[statusNumber] || 'Что-то не так с заказом :(';
};

const getMenuList = (items) => items.map((currentItem) => (
`${currentItem.name} ${currentItem.quantity > 1 ? `(${currentItem.quantity} штук)` : ''}`
));

const shippingTypesStrings = {
  pickup: 'Самовывоз',
  delivery: 'Доставка',
  inhouse: 'Покушаю тут'
};

const getInfoArray = (order, restName) => {
  const zakaz = `Заказ <b>№${order.orderNumber}</b> (${restName})`;
  const format = `Формат: <b>${shippingTypesStrings[order.shippingType]}</b>`;
  const phone = `Телефон клиента: <b><i>${order.phone}</i></b>`;
  const address = `Адрес клиента: <b>${delivery.getCities()[(order.city)]}, ${order.address}</b>`;
  const status = `Текущий статус: <b>${getStatusTestOfStatusNumber(order.status, order.shippingType)}</b>`;
  const menu = `
Меню (${order.total - order.deliveryPrice} Р):
${getMenuList(order.items).join(`
`)}
  `;
  const skidka = `Скидка: ${order.discount} Р`;
  const dostavka = `Доставка: ${order.deliveryPrice} Р`;
  const vsego = `Всего: ${order.total - order.discount} Р`;
  const oplata = `Оплата: <b>${order.payType === 'online' ? 'Перевод онлайн' : 'Наличными'}</b>`;
  const upd = `upd: ${moment().format('h:mm:ss')}`;

  return {
    zakaz,
    format,
    phone,
    address,
    status,
    menu,
    dostavka,
    skidka,
    vsego,
    oplata,
    upd,

    isShippingDelivery: order.shippingType === 'delivery',
    isShippingPickup: order.shippingType === 'pickup',
    isShippingHouse: order.shippingType === 'inhouse'
  };
};

const getMessageOrderTelegram = (order, restName) => {
  const infoMap = getInfoArray(order, restName);

  return `
${infoMap.zakaz}
${infoMap.format}
${infoMap.phone}
${infoMap.address}
${infoMap.status}
${infoMap.menu}
${infoMap.isShippingDelivery ? infoMap.dostavka : ''}
${infoMap.skidka}
${infoMap.vsego}
${infoMap.oplata}
${infoMap.upd}
`;
};

const getMessageOrderWeb = (order, restName) => {
  const infoMap = getInfoArray(order, restName);
  const menu = `
Меню (${order.total - order.deliveryPrice} Р): <br />
${getMenuList(order.items).join('<br />')}
  `;

  return `
${infoMap.zakaz} <br />
<br />
${infoMap.format} <br />
${infoMap.phone} <br />
${infoMap.address} <br />
${infoMap.status} <br />
<br />
${menu} <br />
<br />
${infoMap.dostavka} <br />
${infoMap.skidka} <br />
${infoMap.vsego} <br />
${infoMap.oplata} <br />
`;
};

// const getHtmlMessageOrder = (order, restName) => {
//   const infoMap = getInfoArray(order, restName);
// };

module.exports = {
  getMessageOrder,
  getMessageOrderWeb,
  getMessageOrderTelegram,
  getStatusTestOfStatusNumber
};
