const Logging = require('./logging');
const util = require('util');
const request = util.promisify(require('request'));
const { envFlag, envRequire } = require('./env');

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

const statuses = [
  'В обработке',
  'Принят и уже готовится',
  'Уже едет к вам',
  'Доставлен',
  'Отменен клиентом',
  'Отменен рестораном'
];

const getStatusTestOfStatusNumber = (statusNumber) => {
  return statuses[statusNumber] || 'Что-то не так с заказом :(';
};

const SmsRu = require('sms_ru');

const smsClient = new SmsRu('BB0FE51A-85B4-3EFE-C3C6-F69AE01C6C6A');

const sendNotificationToPhoneAdmin = (text) => {
  const numberPhoneAdmin = '79850789026';

  smsClient.sms_send({to: numberPhoneAdmin, text: text || 'Получен новый заказ'}, (e) => {
    console.log(e.description);
  });
};

const sendNotificationToUser = (phone, text) => {
  smsClient.sms_send({to: phone, text: text || 'Получен новый заказ'}, (e) => {
    console.log(e.description);
  });
};

const sendTelegramMessageToAdmin = (message) => {
  const clientTg = {
    recipient: null,
    message: null,
    token: null,
    endpoint: 'https://api.telegram.org/bot%token/sendMessage?chat_id=%chatId&text=%message',

    setToken: function (token) {
      this.token = token;
    },

    setRecipient: function (chatId) {
      this.recipient = chatId;
    },

    setMessage: function (message) {
      this.message = message;
    },

    send: async function () {
      let endpointUrl = this.endpoint
          .replace('%token', this.token)
          .replace('%chatId', this.recipient)
          .replace('%message', this.message);

      try {
        await request({
          uri: endpointUrl,
          method: 'GET',
        });
      } catch (error) {
        console.log(error);
      }
    }
  };

  clientTg.setToken('1365977882:AAEgiIM3kxjKat61XDhD_2ep_fYLQReTXGM');

  // Admin 1 Макуша
  clientTg.setRecipient('1128268046');
  clientTg.setMessage(message || 'You have a new order!');
  clientTg.send();

  // Admin 2 Ибрагим
  clientTg.setRecipient('689459158');
  clientTg.setMessage(message || 'You have a new order!');
  clientTg.send();

  // Admin 3 Магомед
  clientTg.setRecipient('368250774');
  clientTg.setMessage(message || 'You have a new order!');
  clientTg.send();
};

module.exports = {
  getStatusTestOfStatusNumber,
  sendNotificationToPhoneAdmin,
  sendNotificationToUser,
  sendTelegramMessageToAdmin,
  envFlag,
  envRequire,
  Logging,
  UserResponse,
  UserError,
  UserResponseOK,

  // randomToken,
  
  // NotImplementedError,
  // Rating,
  // Tick,
  // sentry,
  // queue,
  // MailSender,
  // hideCredential,
  // sum,
  // hash,
  // choose,
  // groupByGap,
  // HistoricalRates,
  // SimpleCache,
  // restGetURL,
  // buildArgs,
  // filteredPairs,
  // filterObject,
  // following,
  
  // ds,
  // cluster,
  // sha256,
  // stableStringify,
  // JSONHash,
  // mod,
  // Converter,
  // FutureProfits,
};
