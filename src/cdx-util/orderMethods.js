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

const smiles = [
  '\u{1F609}',
  '\u{1F60A}',
  '\u{1F60B}',
  '\u{1F60C}',
  '\u{1F61C}',
  '\u{1F624}',
  '\u{1F632}',
  '\u{1F635}',
  '\u{1F63B}',
  '\u{1F648}',
  '\u{270C}',
  '\u{1F680}',
  '\u{1F380}',
  '\u{1F388}',
];
const getRandorSmile = () => {
  const max = smiles.length - 1;
  const min = 0;
  const random = (Math.random() * (max - min)) + min;

  return smiles[random];
};

const getInfoArray = (order, restName) => {
  const zakazForOwner = `Заказ <b>№${order.orderNumber}</b> (${restName})`;
  const zakazForRest = `Заказ <b>№${order.orderNumber}</b>`;
  const format = `Формат: <b>${shippingTypesStrings[order.shippingType]}</b>`;
  const phone = `Телефон клиента: <b><i>${order.phone}</i></b>`;
  const address = `Адрес клиента: <b>${order.isLavka ? order.city : delivery.getCities()[(order.city)]}, ${order.address}</b>`;
  const status = `Текущий статус: <b>${getStatusTestOfStatusNumber(order.status, order.shippingType)}</b>`;
  const menu = `
Меню:
${getMenuList(order.items).join(`
`)}
  `;
  const skidka = `Скидка: ${order.discount} Р`;
  const dostavka = `Доставка: ${order.deliveryPrice} Р`;
  const vsegoForRest = `Всего: <b>${order.total - order.discount - order.deliveryPrice} Р</b> (скидка: ${order.discount})`;
  const vsegoForOwner = `Всего: <b>${order.total - order.discount} Р</b> (скидка: ${order.discount})`;
  const oplata = `Оплата: <b>${order.payType === 'online' ? 'Перевод онлайн' : 'Наличными'}</b>`;
  const upd = `upd: ${moment().format('h:mm:ss')}`;
  const smile = getRandorSmile();

  return {
    smile,
    zakazForOwner,
    zakazForRest,
    format,
    phone,
    address,
    status,
    menu,
    dostavka,
    skidka,
    vsegoForOwner,
    vsegoForRest,
    oplata,
    upd,

    isShippingDelivery: order.shippingType === 'delivery',
    isShippingPickup: order.shippingType === 'pickup',
    isShippingHouse: order.shippingType === 'inhouse'
  };
};

const getMessageOrderTelegram = (order, restName, options = {
  isOwner: false,
}) => {
  const isOwner = options.isOwner;
  const infoMap = getInfoArray(order, restName);
  const list = [
    infoMap.smile,,
    isOwner ? infoMap.zakazForOwner : infoMap.zakazForRest,
    '',
    infoMap.format,
    infoMap.phone,
  ];

  if (infoMap.isShippingDelivery) {
    list.push(infoMap.address);
  }

  list.push(infoMap.status);

  list.push(infoMap.menu);

  if (isOwner && infoMap.isShippingDelivery) {
    list.push(infoMap.dostavka);
  }

  list.push(
    isOwner ? infoMap.vsegoForOwner : infoMap.vsegoForRest
  );

  if (isOwner) {
    list.push(infoMap.oplata);
  }

  list.push('');

  if (isOwner) {
    list.push(infoMap.upd);
  }

  return list.join(`
`);
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
