const Logging = require('./logging');
const { envFlag, envRequire } = require('./env');
const telegramClient = require('./telegram');
const orderMethods = require('./orderMethods');
const phoneNotification = require('./phoneNotification');
const delivery = require('./delivery');

const hardCodeTelegramAdminIds = [
  '368250774',
  '689459158',
]

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

  arrIds.forEach((currentTgId) => (
    telegramClient.sendMessage(currentTgId, message)
  ));
};

const sendTelegramMessageToAdmin = (tgRestId, restName, {order}) => {
  const arrIds = [...hardCodeTelegramAdminIds];

  if (tgRestId) {
    arrIds.unshift(tgRestId);
  }

  arrIds.forEach((currentTgId) => {
    try {
      telegramClient.sendMessageOrder(currentTgId, restName, {order});
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
