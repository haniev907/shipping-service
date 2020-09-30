const express = require('express');
const Controllers = require('./controllers');

const isSuperAdmin = (password) => password === 'hanievSuperAdmin818';

const router = express.Router();
const init = (config, cdx) => {
  const controllers = Controllers.init(config, cdx);

  router.use(express.json());

  router.use('/*/:superPasswordParams', function (req, res, next) {
    const {body: {superPasswordBody}} = req;
    const {params: {superPasswordParams}} = req;

    if (!isSuperAdmin(superPasswordBody) && !isSuperAdmin(superPasswordParams)) {
      throw 'У вас нет таких прав';
    }
  
    next();
  });

  router.get('/promocodes/:superPasswordParams', controllers.getPromocodes);
  router.post('/promocode', controllers.addPromocode);
  router.post('/promocode/edit', controllers.editPromocode);

  return router;
};


module.exports = (config, cdx) => init(config, cdx);
