const express = require('express');
const config = require('../../config').auth;
const cdx = require('../../src/cdx')(config);

const server = cdx.web.server();
const router = express.Router();

router.use(express.json());

router.post('/key/make', async (req, res) => {
  try {
    const credentials = req.body;
    const key = await cdx.auth.createUserKey(credentials.password);

    return res.json({ key });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post('/token/issue', async (req, res) => {
  try {
    const credentials = req.body;

    const { accessToken, refreshToken } = await cdx.auth.authenticate(
      credentials.email,
      credentials.password,
    );

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return res.json({ error: 'Authentication error' });
  }
});

router.post('/token/refresh', async (req, res) => {
  const credentials = req.body;

  try {
    const { accessToken, refreshToken } = await cdx.auth.refresh(
      credentials.accessToken,
      credentials.refreshToken,
    );

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return res.json({ error: 'Invalid token' });
  }
});

server.registerRouter('/', router);

server.start();
