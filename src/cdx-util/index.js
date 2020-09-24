const Logging = require('./logging');
const { envFlag, envRequire } = require('./env');
const telegramClient = require('./telegram');
const orderMethods = require('./orderMethods');
const phoneNotification = require('./phoneNotification');
const delivery = require('./delivery');

const hardCodeTelegramAdminIds = [
  '368250774', // ibragim
  '689459158', // magomed
  '609733324', // lida
  '408388567' // daniil
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
  ([tgRestId, ...hardCodeTelegramAdminIds]).forEach((currentTgId) => (
    telegramClient.sendMessage(currentTgId, message)
  ));
};

const sendTelegramMessageToAdmin = (tgRestId, restName, {order}) => {  
  ([tgRestId, ...hardCodeTelegramAdminIds]).forEach((currentTgId) => (
    telegramClient.sendMessageOrder(currentTgId, restName, {order})
  ));
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
