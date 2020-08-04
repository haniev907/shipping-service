const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class Crypt {
  /**
   * @param {object} config
   */
  constructor(config) {
    this.config = config.auth;
  }

  /**
   * Take digest from password with pbkdf2
   * @param {string} password
   * @returns {string} string with password info for verification (key).
   */
  getKey(password) {
    const salt = crypto.randomBytes(this.config.pbkdf2.keySize);
    const digest = crypto.pbkdf2Sync(
      password, salt,
      this.config.pbkdf2.iterations,
      this.config.pbkdf2.keySize,
      this.config.pbkdf2.digestAlg,
    );
    const parts = [
      this.config.pbkdf2.digestAlg,
      salt.toString('hex'),
      digest.toString('hex'),
      this.config.pbkdf2.iterations,
    ];

    return parts.join(this.config.pbkdf2.delimiter);
  }

  /**
   * Verifies password with user key.
   * @param {string} password
   * @param {string} key
   * @returns {boolean}
   */
  verifyPassword(password, key) {
    const [digestAlg, salt, digest, iterations] = key.split(
      this.config.pbkdf2.delimiter,
    );

    return digest === crypto.pbkdf2Sync(
      password, Buffer.from(salt, 'hex'),
      parseInt(iterations, 10),
      digest.length / 2, // In hexadecimal string 2 symbols are equal to 1 byte.
      digestAlg,
    ).toString('hex');
  }

  /**
   * Creates web token
   * @param {object} claims
   * @param {string|number} expiresIn zeit/ms format
   * @returns {string}
   */
  getToken(claims, expiresIn) {
    return jwt.sign(
      claims,
      this.config.jwt.privateKey,
      {
        algorithm: this.config.jwt.algorithm,
        expiresIn,
      },
    );
  }

  /**
   * Creates access token
   * @param {string} userId
   * @returns {string}
   */
  getAccessToken(userId) {
    return this.getToken(
      { userId },
      this.config.jwt.accessTokenExpiration,
    );
  }

  /**
   * Creates refresh token
   * @param {string} accessToken
   * @return {string}
   */
  getRefreshToken(accessToken) {
    return this.getToken(
      { accessToken },
      this.config.jwt.refreshTokenExpiration,
    );
  }

  /**
   * Verifies web token
   * @param {string} token
   * @param {number|null} toleranceSeconds
   * @returns {object}
   */
  verifyToken(token, toleranceSeconds = null) {
    return jwt.verify(
      token, this.config.jwt.publicKey,
      {
        clockTolerance: toleranceSeconds === null
          ? this.config.jwt.toleranceSeconds
          : toleranceSeconds,
      },
    );
  }

  /**
   * Decodes web token
   * @param {string} token
   * @returns {object}
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = Crypt;
