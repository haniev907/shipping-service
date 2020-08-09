const Logging = require('./logging');
const Rating = require('./rating');
const Tick = require('./tick');
const Converter = require('./converter');
const queue = require('./queue');
const HistoricalRates = require('./historical-rates');
const SimpleCache = require('./simple-cache');
const following = require('./following');
const MailSender = require('./mail');
const sentry = require('./sentry');
const ds = require('./ds');
const cluster = require('./cluster');
const FutureProfits = require('./future-profits');


const { envFlag, envRequire } = require('./env');
const {
  sum,
  hash,
  choose,
  groupByGap,
  restGetURL,
  buildArgs,
  filteredPairs,
  filterObject,
  randomToken,
  sha256,
  stableStringify,
  JSONHash,
  mod,
} = require('./common');

const NotImplementedError = () => new Error('Method not implemented');

const hideCredential = str => `${str.slice(0, 2)}...${str.slice(-2)}`;

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
  'Принят и уже готовится :)',
  'Уже едет к вам :)',
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

module.exports = {
  getStatusTestOfStatusNumber,
  sendNotificationToPhoneAdmin,
  sendNotificationToUser,

  randomToken,
  envFlag,
  envRequire,
  NotImplementedError,
  Logging,
  Rating,
  Tick,
  sentry,
  queue,
  MailSender,
  hideCredential,
  sum,
  hash,
  choose,
  groupByGap,
  HistoricalRates,
  SimpleCache,
  restGetURL,
  buildArgs,
  filteredPairs,
  filterObject,
  following,
  UserResponse,
  UserError,
  UserResponseOK,
  ds,
  cluster,
  sha256,
  stableStringify,
  JSONHash,
  mod,
  Converter,
  FutureProfits,
};
