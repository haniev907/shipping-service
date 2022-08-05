const cdxUtil = require('../../../../src/cdx-util');
const base64Img = require('base64-img');
const fs = require("fs")

const collect = (config, cdx) => {
  return {
    addPromocode: async (req, res) => {
      const {
        body: {
          data
        },
      } = req;

      await cdx.db.promocode.createPromocode(data);

      res.json(new cdxUtil.UserResponseOK());
    },

    getPromocodes: async (req, res) => {
      const promocodes = await cdx.db.promocode.getAll();

      res.json(new cdxUtil.UserResponse(promocodes));
    },

    editPromocode: async (req, res) => {
      const {
        body: {
          idPromocode, data
        },
      } = req;

      await cdx.db.promocode.editPromocode(idPromocode, data);

      res.json(new cdxUtil.UserResponseOK());
    },
  };
};

module.exports.init = (config, cdx) => collect(config, cdx);
