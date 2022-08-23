const TelegramBot = require('node-telegram-bot-api');
const statuses = require('./statuses');
const orderMethods = require('./orderMethods');
const phoneNotification = require('./phoneNotification');
const cdxUtil = require('./');

const idSendOrderToRest = 1;
const idFinishPickup = 3;
const idFinishDelivery = 4;
const idCancelFromClient = 5;
const idCancelFromRest = 6;

const token = process.env.TG_BOT;

const bot = new TelegramBot(token, {polling: true});

const createCallbackData = (actionId, orderId) => `${actionId}/${orderId}`
const getCallbackData = (callbackDataString) => {
  const resArray = callbackDataString.split('/');

  return {
    actionId: resArray[0], orderId: resArray[1]
  };
};

const getMarkups = (orderId, shippingType, nowOrderStatus, options = {
  isOwner: false,
}) => {
  // const resArray = statuses.map((currentStatus, index) => [{
  //   text: orderMethods.getStatusTestOfStatusNumber(index, shippingType), 
  //   callback_data: createCallbackData(index, orderId)
  // }]);
  console.log({
    orderId,
    shippingType,
    nowOrderStatus,
  });

  const isOwner = options.isOwner;

  const resArray = [
    [{
      text: 'Обновить данные про заказ', callback_data: createCallbackData(-1, orderId)
    }]
  ];

  if (isOwner) {
    return resArray.concat(statuses.map((_, index) => ([{
      text: orderMethods.getStatusTestOfStatusNumber(index, shippingType), 
      callback_data: createCallbackData(index, orderId)
    }])))
  }

  if (!isOwner && nowOrderStatus > 3) {
    return resArray;
  }

  if (shippingType === 'pickup' && nowOrderStatus === idFinishPickup) {
    return resArray;
  }

  // Если отменено
  if ([idCancelFromClient, idCancelFromRest, idFinishDelivery].includes(nowOrderStatus)) {
    return resArray;
  }

  const nextStatusIndex = nowOrderStatus + 1;  
  const cancelStatusIndex = statuses.length - 1;

  [nextStatusIndex, cancelStatusIndex].forEach((currentStatusIndex) => {
    resArray.push([{
      text: orderMethods.getStatusTestOfStatusNumber(currentStatusIndex, shippingType), 
      callback_data: createCallbackData(currentStatusIndex, orderId)
    }]);
  });

  return resArray;
};

const enableHandleChangeStatus = (cdx) => {
  bot.on('callback_query', async (callbackQuery) => {
    const callbackData = getCallbackData(callbackQuery.data);
    const msg = callbackQuery.message;
    const options = {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      parse_mode : 'HTML'
    };

    const isOwner = hardCodeTelegramAdminIds.includes(msg.chat.id);

    console.log(msg.chat.id, {isOwner, hardCodeTelegramAdminIds});

    // Акшен обновить данные
    if (callbackData.actionId === '-1') {
      try {
        const order = await cdx.db.order.getOrderById(callbackData.orderId);
        const fullOrder = await cdx.db.wrapper.getFullOrder(order._id);
        const rest = await cdx.db.restaurant.getRestaurantByRestId(fullOrder.restId);
        const newMessage = orderMethods.getMessageOrderTelegram(fullOrder, rest.name, {isOwner: isOwner});

        options.reply_markup = JSON.stringify({
          inline_keyboard: getMarkups(callbackData.orderId, order.shippingType, order.status, {
            isOwner: isOwner,
          })
        });

        bot.editMessageText(newMessage, options);
      } catch (error) {
        console.log(error);
      }

      return;
    }

    try {
      const updatedOrder = await cdx.db.order.upgradeOrder(callbackData.orderId, callbackData.actionId);
      const readyOrder = await cdx.db.wrapper.getFullOrder(updatedOrder._id);
      const rest = await cdx.db.restaurant.getRestaurantByRestId(readyOrder.restId);
      const newMessage = orderMethods.getMessageOrderTelegram(readyOrder, rest.name, {isOwner: isOwner});

      // Момент принятия заказы управляющей компанией
      if (readyOrder.status === idSendOrderToRest) {
        sendTelegramMessageToAdmin(rest.telegramChatId, rest.name, {
          order: readyOrder
        });
      }

      options.reply_markup = JSON.stringify({
        inline_keyboard: getMarkups(callbackData.orderId, readyOrder.shippingType, readyOrder.status, {
          isOwner,
        })
      });

      bot.editMessageText(newMessage, options);
    } catch (error) {
      console.log(error);
    }
  });
};

const sendMessageOrder = async (chatId, restName, {order}) => {
  const isOwner = hardCodeTelegramAdminIds.includes(chatId);
  await bot.sendMessage(chatId, orderMethods.getMessageOrderTelegram(order, restName, {isOwner: isOwner}), {
    reply_markup: JSON.stringify({
      inline_keyboard: getMarkups(order._id, order.shippingType, order.status, {isOwner: isOwner})
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
  console.log('Бот тг стартовал');
  enableHandleChangeStatus(cdx);
  enableHandlePullMessage();
};

const IBR_CHAT_ID = 368250774;

const hardCodeTelegramAdminIds = [
  IBR_CHAT_ID, // ibragim
];

const sendTelegramMessageToAdmin = (tgRestId, restName, {order}) => {
  let arrIds = [...hardCodeTelegramAdminIds];

  if (tgRestId && !arrIds.includes(tgRestId)) {
    arrIds.unshift(tgRestId);
  }

  const sended = {};

  arrIds.forEach((currentTgId) => {
    try {
      if (sended[currentTgId]) {
        return;
      }

      sendMessageOrder(currentTgId, restName, {order});
      sended[currentTgId] = true;
    } catch (error) {
      console.log(`Ошибка отправки тг-уведомления на ${currentTgId}`);
    }
  });
};

module.exports = {
  init,
  sendMessageOrder,
  sendMessage,
  sendTelegramMessageToAdmin,
};
