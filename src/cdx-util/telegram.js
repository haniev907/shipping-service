const TelegramBot = require('node-telegram-bot-api');
const statuses = require('./statuses');
const orderMethods = require('./orderMethods');
const orderDb = require('./orderDb');
const phoneNotification = require('./phoneNotification');

const token = '1382278246:AAEacKQoKWR6vMlvDtkLH5f_7buwvX8qWfE';

const bot = new TelegramBot(token, {polling: true});

const createCallbackData = (actionId, orderId) => `${actionId}/${orderId}`
const getCallbackData = (callbackDataString) => {
  const resArray = callbackDataString.split('/');

  return {
    actionId: resArray[0], orderId: resArray[1]
  };
};

const getMarkups = (orderId) => {
  const resArray = statuses.map((currentStatus, index) => [{
    text: currentStatus, callback_data: createCallbackData(index, orderId)
  }]);

  resArray.unshift([{
    text: 'Обновить данные про заказ', callback_data: createCallbackData(-1, orderId)
  }])

  return resArray;
};

const enableHandleChangeStatus = (cdx) => {
  bot.on('callback_query', async (callbackQuery) => {
    const callbackData = getCallbackData(callbackQuery.data);
    const msg = callbackQuery.message;
    const options = {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: JSON.stringify({
        inline_keyboard: getMarkups(callbackData.orderId)
      }),
      parse_mode : 'HTML'
    };

    // Акшен обновить данные
    if (callbackData.actionId === '-1') {
      try {
        const order = await cdx.db.order.getOrderById(callbackData.orderId);
        const fullOrder = await orderDb.getFullOrder(cdx, order);
        const newMessage = orderMethods.getHtmlMessageOrder(fullOrder);

        bot.editMessageText(newMessage, options);
      } catch (error) {
        console.log(error);
      }

      return;
    }

    try {
      const updatedOrder = await cdx.db.order.upgradeOrder(callbackData.orderId, callbackData.actionId);
      const readyOrder = await orderDb.getFullOrder(cdx, updatedOrder);
      const newMessage = orderMethods.getHtmlMessageOrder(readyOrder);

      bot.editMessageText(newMessage, options);

      const messageStatus = orderMethods.getStatusTestOfStatusNumber(readyOrder.status);
      phoneNotification.sendNotificationToUser(readyOrder.phone, `
        eda-hh.ru! Ваш заказ ${messageStatus.toLowerCase()}. Спасибо, что вы с нами!
      `);
  
    } catch (error) {
      console.log(error);
    }
  });
};

const sendMessageOrder = async (chatId, restName, {order}) => {
  await bot.sendMessage(chatId, orderMethods.getHtmlMessageOrder(order, restName), {
    reply_markup: JSON.stringify({
      inline_keyboard: getMarkups(order._id)
    }),
    parse_mode : 'HTML'
  });
};

const sendMessage = async (chatId, message) => {
  await bot.sendMessage(chatId, message);
};

const enableHandlePullMessage = () => {
  bot.on('message', (msg) => {
    if (msg.text === '/getChatId') {
      bot.sendMessage(msg.chat.id, msg.chat.id);
    }
  });
};

const init = async (cdx, config) => {
  enableHandleChangeStatus(cdx);
  enableHandlePullMessage();
};

module.exports = {
  init,
  sendMessageOrder,
  sendMessage,
};
