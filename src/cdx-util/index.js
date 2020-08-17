const Logging = require('./logging');
const { envFlag, envRequire } = require('./env');
const telegramClient = require('./telegram');
const orderDb = require('./orderDb');
const orderMethods = require('./orderMethods');
const phoneNotification = require('./phoneNotification');

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

const sendTelegramAnyMessageToAdmin = (message) => {
  telegramClient.sendMessage('1128268046', message);
  telegramClient.sendMessage('368250774', message);
  telegramClient.sendMessage('689459158', message);
};

const sendTelegramMessageToAdmin = ({order}) => {
  telegramClient.sendMessageOrder('1128268046', {order});
  telegramClient.sendMessageOrder('368250774', {order});
  telegramClient.sendMessageOrder('689459158', {order});
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
  orderDb
};
