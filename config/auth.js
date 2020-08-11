const config = {};

config.pbkdf2 = {
  digestAlg: process.env.AUTH_PBKDF2_DIGEST || 'sha512',
  keySize: process.AUTH_PBKDF2_KEYLEN || 64,
  iterations: process.env.AUTH_PBKDF2_ITER || 100000,
  delimiter: '::',
};

config.jwt = {
  publicKey: Buffer.from(process.env.AUTH_JWT_PUBLIC_KEY || '', 'base64'),
  privateKey: Buffer.from(process.env.AUTH_JWT_PRIVATE_KEY || '', 'base64'),
  algorithm: process.env.AUTH_JWT_ALGORITHM || 'ES512',
  accessTokenExpiration: '1d',
  refreshTokenExpiration: '2d',
  toleranceSeconds: 300,
};

config.server = {
  url: process.env.AUTH_SERVER_URL || 'http://localhost:5001',
};

// Read the https://validatejs.org/ documentation
config.credentialsConstraints = {
  email: {
    email: true,
    presence: true,
  },
  password: {
    presence: true,
    length: {
      minimum: 6,
      message: 'Password is too short (minimum length is 6 characters)',
    },
  },
};

module.exports = config;
