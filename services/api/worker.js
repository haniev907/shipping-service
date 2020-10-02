const util = require('util');
const validate = require('validate.js');

const express = require('express');
const config = require('@cdx/config');
const cdx = require('@cdx/core')(config);
const cdxUtil = require('@cdx/util');
const { userRouter, publicRouter, adminRouter } = require('./router')(config, cdx);
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');

const request = util.promisify(require('request'));

const logger = new cdxUtil.Logging();

const excel = require('excel4node');

const server = cdx.web.server();
const router = express.Router();

router.use(express.static('./public'));

router.use(bodyParser.json({limit: '50mb'}));
router.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
// router.use(express.json());

// Стартуем бота
cdxUtil.startTelegramBotAdmin(cdx, config);

router.get('/ping', (_, res) => {
  res.json(new cdxUtil.UserResponseOK());
});

router.get('/syncOrders/:count', async (req, res) => {
  const {
    params: {
      count,
    },
  } = req;

  const orders = await cdx.db.order.getAll(count);

  orders.reduce(async (prev, currentOrder, index) => {
    await prev;

    const fullItemsData = await cdx.db.wrapper.getFullDishes(currentOrder.items);
    const deliveryPrice = currentOrder.shippingType === 'pickup' ? 0 : (currentOrder.deliveryPrice || 100);
    const totalPrice = fullItemsData.totalPrice + deliveryPrice;

    console.log((((index + 1) / orders.length) * 100).toFixed(2) + '%', currentOrder._id, totalPrice);

    await cdx.db.order.editOrder(currentOrder._id, {
      total: totalPrice,
      deliveryPrice
    });
  }, Promise.resolve());

  res.json(new cdxUtil.UserResponse(orders));
});

router.get('/stats', async (_, res) => {
  const orders = await cdx.db.order.getAll();

  const uniqSwapedOrdersMap = orders.reduce((prevResponse, currentOrder) => {
    const {responseList, mapChecking} = prevResponse;

    const index = currentOrder.phone;
    const processedOrder = {...currentOrder._doc};

    if (!mapChecking[index]) {
      mapChecking[index] = [];
      processedOrder.uniq = true;
    } else {
      processedOrder.uniq = false;
    }

    mapChecking[index].push(processedOrder);
    responseList.push(processedOrder);

    return prevResponse;
  }, {
    responseList: [],
    mapChecking: {}
  });

  const mapOrdersOfDays = uniqSwapedOrdersMap.responseList.reduce((prevResponse, currentOrder) => {
    const index = moment.utc(currentOrder.createdAt).startOf('day').format('L');

    if (!prevResponse[index]) {
      prevResponse[index] = [];
    }

    prevResponse[index].push(currentOrder);

    return prevResponse;
  }, {});

  const statsOfDay = Object.entries(mapOrdersOfDays).reduce((prevResponse, [day, listOrders]) => {
    const index = day;
  
    if (!prevResponse[index]) {
      prevResponse[index] = {};
    }

    prevResponse[index].totalPrice = listOrders.reduce((prevAmount, currentOrder) => prevAmount + (currentOrder.total - currentOrder.deliveryPrice), 0);
    prevResponse[index].averagePrice = prevResponse[index].totalPrice / listOrders.length;
    prevResponse[index].quantityOrders = listOrders.length;
    prevResponse[index].quantityUniqOrders = listOrders.reduce((prevUniqQuantity, currentOrderForUniq) => prevUniqQuantity + (currentOrderForUniq.uniq ? 1 : 0), 0);
    prevResponse[index].quantityRetenshenOrders = prevResponse[index].quantityOrders - prevResponse[index].quantityUniqOrders;
    prevResponse[index].quantityRetenshenOrdersRatio = ((prevResponse[index].quantityRetenshenOrders / prevResponse[index].quantityOrders) * 100).toFixed(2);
    prevResponse[index].canceledOrders = listOrders.reduce((prevUniqQuantity, currentOrderForUniq) => prevUniqQuantity + (currentOrderForUniq.status > 3 ? 1 : 0), 0);
    prevResponse[index].canceledOrdersRatio = ((prevResponse[index].canceledOrders / prevResponse[index].quantityOrders) * 100).toFixed(2);

    return prevResponse;
  }, {});

  const allDaysData = Object.entries(statsOfDay).reduce((prevResponse, [dayKey, dayData], nTicks) => {
    if (!Object.keys(prevResponse).length) {
      return {...dayData}
    }

    prevResponse.totalPrice += dayData.totalPrice;
    prevResponse.quantityOrders += dayData.quantityOrders;
    prevResponse.quantityUniqOrders += dayData.quantityUniqOrders;
    prevResponse.quantityRetenshenOrders = prevResponse.quantityOrders - prevResponse.quantityUniqOrders;
    prevResponse.quantityRetenshenOrdersRatio = ((prevResponse.quantityRetenshenOrders / prevResponse.quantityOrders) * 100).toFixed(2);
    prevResponse.averagePrice = prevResponse.totalPrice / prevResponse.quantityOrders;
    prevResponse.canceledOrders += dayData.canceledOrders;
    prevResponse.canceledOrdersRatio = ((prevResponse.canceledOrders / prevResponse.quantityOrders) * 100).toFixed(2);

    return prevResponse;
  }, {});

  const resData = {
    statsOfDay,
    allDaysData,
    mapOrdersOfDays
  };

  const createFileHtml = () => {
    const header = ['Дата', 'Заказы всего', 'Общая сумма заказов', 'Средний чек', '% отмен заказов (абс)', '% ретеншена (абс)']
    const dayRows = Object.entries(statsOfDay).sort(([dayNameA], [dayNameB]) => {
      const timeA = moment(dayNameA).valueOf();
      const timeB = moment(dayNameB).valueOf();

      return timeA - timeB;
    }).map(([dayName, dayData]) => {
      return [
        dayName,
        dayData.quantityOrders,
        Math.ceil(dayData.totalPrice),
        Math.ceil(dayData.averagePrice),
        `${dayData.canceledOrdersRatio}% (${dayData.canceledOrders})`,
        `${dayData.quantityRetenshenOrdersRatio}% (${dayData.quantityRetenshenOrders})`
      ];
    });

    const endRows = ['Всего',
      allDaysData.quantityOrders,
      Math.ceil(allDaysData.totalPrice),
      Math.ceil(allDaysData.averagePrice),
      `${allDaysData.canceledOrdersRatio}% (${allDaysData.canceledOrders})`,
      `${allDaysData.quantityRetenshenOrdersRatio}% (${allDaysData.quantityRetenshenOrders})`
    ];

    return `
      <html>
        <style>
          td {
            background: #f2f2f2;
            padding: 10px 20px;
          }
        </style>
        <body>
          <table>
            <tr>
              ${header.map((currentHeaderCol) => (`<td>${currentHeaderCol}</td>`))}
            </tr>
            ${dayRows.map((currentRow) => (`
              <tr>
                ${currentRow.map((currentRowCol) => (`<td>${currentRowCol}</td>`))}
              </tr>
            `))}
            <tr>
                ${endRows.map((currentRowCol) => (`<td>${currentRowCol}</td>`))}
              </tr>
          </table>
          <script>
            console.log(${JSON.stringify(resData)})
          </script>
        </body>
      </html>
    `;
  };

  const statsStrXls = createFileHtml();
  return res.send(statsStrXls);

  // res.json(new cdxUtil.UserResponse({
  //   statsOfDay,
  //   allDaysData,
  //   mapOrdersOfDays
  // }));
});


router.get('/users', async (_, res) => {
  const orders = await cdx.db.order.getAll();

  const usersMap = orders.reduce((prevResponse, currentOrder) => {
    const index = currentOrder.phone;

    if (!prevResponse[index]) {
      prevResponse[index] = [];
    }

    prevResponse[index].push(currentOrder);

    if (prevResponse[index].length > 1) {
      prevResponse[index] = prevResponse[index].sort((orderA, orderB) => moment(orderA.createdAt).valueOf() - moment(orderB.createdAt).valueOf());
    }

    return prevResponse;
  }, {});

  const createFileHtml = () => {
    const header = ['Телефон', 'Заказов всего', 'Последний заказ', 'Город', 'Всего на сумму']
    const dayRows = Object.entries(usersMap)
      .sort(([, userOrdersA], [, userOrdersB]) => {
        const lastOrderTimeA = moment(userOrdersA[userOrdersA.length - 1].createdAt).valueOf();
        const lastOrderTimeB = moment(userOrdersB[userOrdersB.length - 1].createdAt).valueOf();

        return lastOrderTimeB - lastOrderTimeA;
      })
      .map(([userPhone, userOrders]) => {
        const amountOrders = userOrders.length;
        const lastOrder = userOrders[userOrders.length - 1];
        const lastOrderTime = moment(lastOrder.createdAt).format('L');
        const city = cdxUtil.delivery.getCities()[lastOrder.city] || lastOrder.address;
        const amountPrice = userOrders.reduce((prev, currentOrder) => prev + currentOrder.total, 0);

        return [
          userPhone,
          amountOrders,
          lastOrderTime,
          city,
          amountPrice
        ];
      });

    return `
      <html>
        <style>
          td {
            background: #f2f2f2;
            padding: 10px 20px;
          }
        </style>
        <body>
          <table>
            <tr>
              ${header.map((currentHeaderCol) => (`<td>${currentHeaderCol}</td>`))}
            </tr>
            ${dayRows.map((currentRow) => (`
              <tr>
                ${currentRow.map((currentRowCol) => (`<td>${currentRowCol}</td>`))}
              </tr>
            `))}
          </table>
        </body>
      </html>
    `;
  };

  const statsStrXls = createFileHtml();
  return res.send(statsStrXls);
});

router.post('/auth/signup', async (req, res) => {
  const userData = req.body;

  // Validate credentials
  const validationResult = validate(
    { password: userData.password, email: userData.email },
    config.auth.credentialsConstraints,
  );

  if (validationResult) {
    throw new cdxUtil
      .UserError(validationResult[Object.keys(validationResult)[0]]);
  }

  const { body: { key } } = await request({
    uri: `${config.auth.server.url}/key/make`,
    method: 'POST',
    json: { password: userData.password },
  });

  if (!key) {
    throw new cdxUtil.UserError('Bad request');
  }

  await cdx.db.user.createUser(
    userData.email, key,
  );

  res.json(new cdxUtil.UserResponseOK());
});

router.post('/auth/login', async (req, res) => {
  const credentials = req.body;

  const { body: { accessToken, refreshToken } } = await request({
    uri: `${config.auth.server.url}/token/issue`,
    method: 'POST',
    json: { email: credentials.email, password: credentials.password },
  });

  if (!accessToken || !refreshToken) {
    throw new cdxUtil.UserError('Authentication failed');
  }

  res.json(new cdxUtil.UserResponse({ accessToken, refreshToken }));
});

router.post('/auth/refresh', async (req, res) => {
  const foo = await request({
    uri: `${config.auth.server.url}/token/refresh`,
    method: 'POST',
    json: {
      accessToken: req.headers['access-token'],
      refreshToken: req.headers['refresh-token'],
    },
  });

  const { body: { accessToken, refreshToken } } = foo;

  if (!accessToken || !refreshToken) {
    throw new cdxUtil.UserError('Authentication failed');
  }

  res.json(new cdxUtil.UserResponse({ accessToken, refreshToken }));
});

// Register all the routers
server.registerRouter('/', router);
server.registerRouter('/user', userRouter);
server.registerRouter('/public', publicRouter);
server.registerRouter('/admin', adminRouter);

// Catch the errors
server.app.use((err, req, res, next) => {
  logger.error('error', { message: err.message });

  if (err instanceof cdxUtil.UserError) {
    // - The error details should be returned to the client
    const response = new cdxUtil.UserResponse(
      null,
      err,
    );

    res.json(response.json());
  } else {
    // - Some interval error has happend, no need to reveal the details
    const response = new cdxUtil.UserResponse(
      null,
      new Error('Internal error'),
      500,
    );

    res.json(response.json());
  }

  return next();
});

server.start();
