const util = require('util');
const validate = require('validate.js');

const express = require('express');
const config = require('@cdx/config');
const cdx = require('@cdx/core')(config);
const cdxUtil = require('@cdx/util');
const { userRouter, publicRouter } = require('./router')(config, cdx);
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

router.get('/syncOrders', async (_, res) => {
  const orders = await cdx.db.order.getAll();

  orders.reduce(async (prev, currentOrder, index) => {
    await prev;

    const fullItemsData = await cdx.db.wrapper.getFullDishes(currentOrder.items);
    const deliveryPrice = currentOrder.deliveryPrice || 100;
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

    return prevResponse;
  }, {});

  const allDaysData = Object.entries(statsOfDay).reduce((prevResponse, [dayKey, dayData], nTicks) => {
    if (!Object.keys(prevResponse).length) {
      return {...dayData}
    }

    prevResponse.totalPrice += dayData.totalPrice;
    prevResponse.quantityOrders += dayData.quantityOrders;
    prevResponse.quantityUniqOrders += dayData.quantityUniqOrders;
    prevResponse.averagePrice = prevResponse.totalPrice / prevResponse.quantityOrders;

    return prevResponse;
  }, {});

  const resData = {
    statsOfDay,
    allDaysData,
    mapOrdersOfDays
  };

  const createFileHtml = () => {
    const header = ['Дата', 'Заказы всего', 'Уникальных заказов', 'Общая сумма заказов', 'Средний чек']
    const dayRows = Object.entries(statsOfDay).sort(([dayNameA], [dayNameB]) => {
      const timeA = moment(dayNameA).valueOf();
      const timeB = moment(dayNameB).valueOf();

      return timeA - timeB;
    }).map(([dayName, dayData]) => {
      return [dayName, dayData.quantityOrders, dayData.quantityUniqOrders, Math.ceil(dayData.totalPrice), Math.ceil(dayData.averagePrice)]
    })

    const endRows = ['Всего', allDaysData.quantityOrders, allDaysData.quantityUniqOrders, Math.ceil(allDaysData.totalPrice), Math.ceil(allDaysData.averagePrice)]

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
