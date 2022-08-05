const Sentry = require('@sentry/node');
const { JsonWebTokenError } = require('jsonwebtoken');

const cdxUtil = require('../../cdx-util');
const Crypt = require('./crypt');

class Auth {
  /**
   * @param {DB} db
   * @param {object} config
   */
  constructor(db, config) {
    /** @private */
    this.db = db;
    /** @private */
    this.crypt = new Crypt(config);
  }

  async createUserKey(password) {
    return this.crypt.getKey(password);
  }

  async authenticate(email, password) {
    const user = await this.db.user.getUserByEmail(email);

    if (user === null) {
      throw Error(`User with email ${email} doesn't exists`);
    }

    if (!this.crypt.verifyPassword(password, user.key)) {
      throw Error(`Wrong password for user ${email}`);
    }

    const accessToken = this.crypt.getAccessToken(user.id);
    const refreshToken = this.crypt.getRefreshToken(accessToken);

    return { accessToken, refreshToken };
  }

  async authorize(token, toleranceSeconds = null) {
    return this.crypt.verifyToken(token, toleranceSeconds);
  }

  async refresh(accessToken, refreshToken) {
    try {
      await this.authorize(accessToken, 0);
      return { accessToken, refreshToken };
    } catch (err) {
      if (err.name !== 'TokenExpiredError') throw new Error(err);

      const accessPayload = await Crypt.decodeToken(accessToken);
      const refreshPayload = await this.crypt.verifyToken(refreshToken, 0);

      if (refreshPayload.accessToken !== accessToken) {
        throw new JsonWebTokenError('refresh token doesn\'t match access token');
      }

      const newAccessToken = this.crypt.getAccessToken(
        accessPayload.userId,
      );
      const newRefreshToken = this.crypt.getRefreshToken(newAccessToken);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
  }

  createMiddleware(authRequired = false) {
    return async (req, res, next) => {
      let claims = {};

      try {
        claims = await this.authorize(req.headers['access-token']);

        req.userId = claims.userId;

        Sentry.configureScope((scope) => {
          scope.setUser({
            id: claims.userId,
            ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          });
        });

        return next();
      } catch (err) {
        if (!authRequired) return next();

        throw new cdxUtil.UserError('Access denied - authentication is required');
      }
    };
  }
}

module.exports = Auth;
