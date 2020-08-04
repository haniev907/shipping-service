const util = require('util');
const validate = require('validate.js');

const express = require('express');
const config = require('@cdx/config');
const cdx = require('@cdx/core')(config);
const cdxUtil = require('@cdx/util');
const { userRouter, publicRouter } = require('./router')(config, cdx);
const bodyParser = require('body-parser');

const request = util.promisify(require('request'));

const logger = new cdxUtil.Logging();

const server = cdx.web.server();
const router = express.Router();

router.use(bodyParser.json({limit: '50mb'}));
router.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
// router.use(express.json());

router.get('/ping', (_, res) => {
  res.json(new cdxUtil.UserResponseOK());
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
