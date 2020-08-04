function envFlag(varName) {
  return ({
    0: false, 1: true,
  })[process.env[varName]] || false;
}

function envRequire(varName) {
  if (process.env[varName] === undefined) {
    throw new Error(`Environment variable ${varName} is required.`);
  }

  return process.env[varName];
}

module.exports = {
  envFlag,
  envRequire,
};
