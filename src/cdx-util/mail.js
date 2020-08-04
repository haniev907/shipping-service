const request = require('request');

class MailSender {
  constructor(config, apiKey, senderName, senderEmail, listId) {
    this.config = config;
    this.defaultParams = {
      format: 'json',
      api_key: (this.config.mail.apiKey || apiKey),
      sender_name: (this.config.mail.senderName || senderName),
      sender_email: (this.config.mail.senderEmail || senderEmail),
      list_id: (this.config.mail.listId || listId),
    };
  }

  async sendEmail(email, body, subject) {
    return request({
      uri: this.config.mail.apiURL,
      method: 'GET',
      json: true,
      qs: {
        ...this.defaultParams,
        subject,
        email,
        body,
      },
    });
  }
}

module.exports = MailSender;
