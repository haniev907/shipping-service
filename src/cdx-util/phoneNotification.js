const SmsRu = require('sms_ru');
const smsClient = new SmsRu('BB0FE51A-85B4-3EFE-C3C6-F69AE01C6C6A');

const enabledSmsNot = true;

const sendNotificationToUser = (phone, text) => {
  if (!enabledSmsNot) {
    return;
  }

  smsClient.sms_send({to: phone, text}, (e) => {
    console.log(e.description);
  });
};

module.exports = {
  sendNotificationToUser
};
