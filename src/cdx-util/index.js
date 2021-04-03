const Logging = require('./logging');
const { envFlag, envRequire } = require('./env');
const telegramClient = require('./telegram');
const orderMethods = require('./orderMethods');
const phoneNotification = require('./phoneNotification');
const delivery = require('./delivery');

const IBR_CHAT_ID = '368250774';
const MAGOMED_CHAT_ID = '689459158';
const LIDA_CHAT_ID = '609733324';

const hardCodeTelegramAdminIds = [
  IBR_CHAT_ID, // ibragim
  MAGOMED_CHAT_ID, // magomed
  LIDA_CHAT_ID, // lida
];

class UserError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, UserError);
  }
}

class UserResponse {
  constructor(data, error = null, code = 200) {
    this.data = data;
    this.error = error;
    this.code = code;
  }

  json() {
    return {
      data: this.data,
      error: this.error.message,
      code: this.code,
    };
  }
}

class UserResponseOK extends UserResponse {
  constructor() {
    super(UserResponse);

    this.data = 'OK';
  }
}

const sendTelegramAnyMessageToAdmin = (tgRestId, message) => {
  const arrIds = [...hardCodeTelegramAdminIds];

  if (tgRestId) {
    arrIds.unshift(tgRestId);
  }

  try {
    arrIds.forEach((currentTgId) => (
      telegramClient.sendMessage(currentTgId, message)
    ));
  } catch (error) {
    console.log('sendTelegramAnyMessageToAdmin', error)
  }
};

const sendTelegramMessageToAdmin = (tgRestId, restName, {order}) => {
  let arrIds = [...hardCodeTelegramAdminIds];

  if (order.isLavka) {
    arrIds.filter((chatId) => chatId !== LIDA_CHAT_ID);
  }

  if (tgRestId && !arrIds.includes(tgRestId)) {
    arrIds.unshift(tgRestId);
  }

  const sended = {};

  arrIds.forEach((currentTgId) => {
    try {
      if (sended[currentTgId]) {
        return;
      }

      telegramClient.sendMessageOrder(currentTgId, restName, {order});
      sended[currentTgId] = true;
    } catch (error) {
      console.log(`Ошибка отправки тг-уведомления на ${currentTgId}`);
    }
  });
};

const startTelegramBotAdmin = (cdx, config) => {
  telegramClient.init(cdx, config);
};

module.exports = {
  getStatusTestOfStatusNumber: orderMethods.getStatusTestOfStatusNumber,
  sendNotificationToUser: phoneNotification.sendNotificationToUser,
  sendTelegramMessageToAdmin,
  sendTelegramAnyMessageToAdmin,
  envFlag,
  envRequire,
  Logging,
  UserResponse,
  UserError,
  UserResponseOK,
  startTelegramBotAdmin,
  orderMethods,
  delivery
};
