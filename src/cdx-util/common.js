const crypto = require('crypto');

const objectHash = require('object-hash');
const request = require('request');

const stableStringify = require('./json-stable-stringify');


function sum(array) {
  return array.reduce((a, b) => a + b, 0);
}

function hash(data) {
  return objectHash(JSON.parse(JSON.stringify(data)));
}

function sha256(data) {
  return crypto.createHash('sha256')
    .update(data, 'binary')
    .digest('hex');
}

function md5(data) {
  return crypto.createHash('md5')
    .update(data, 'binary')
    .digest('hex');
}

function JSONHash(obj) {
  return md5(stableStringify(obj));
}

function choose(choices) {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

function randomToken(length = 10) {
  const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array(...Array(length)).map(() => charSet.charAt(Math.random() * charSet.length)).join('');
}

function groupByGap(arr, fieldName, gapSize) {
  const groups = [];

  arr.forEach((val) => {
    // Initial case
    if (groups.length === 0) {
      groups.push([val]);
    } else {
      const latestGroup = groups[groups.length - 1];
      const diff = val[fieldName] - latestGroup[0][fieldName];

      if (Math.abs(diff) >= gapSize) {
        // - Diff is too big, add new group
        groups.push([val]);
      } else {
        // - Diff
        groups[groups.length - 1].push(val);
      }
    }
  });

  return groups;
}

function filterObject(filterFn, obj) {
  return Object.entries(obj).reduce((res, item) => {
    if (filterFn(item) === true) {
      return {
        ...res,
        [item[0]]: item[1],
      };
    }

    return res;
  }, {});
}

const restGetURL = url => new Promise(
  (resolve, reject) => {
    const cb = (error, res, body) => {
      if (error) return reject(error);

      return resolve(body);
    };

    request(url, { json: true }, cb);
  },
);

const buildArgs = (args) => {
  const argStr = Object.entries(args)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `?${argStr}`;
};

const filteredPairs = async (config, client) => {
  const pairs = await client.getAvailablePairs();

  return pairs
    .reduce(async (chain, pair) => {
      const res = await chain;

      const { base, quote } = await client.splitPair(pair);

      if (config.currencies.volTopSet.has(base) && config.currencies.volTopSet.has(quote)) {
        res.push(pair);
      }

      return res;
    }, Promise.resolve([]));
};

const arrAsyncSome = async (arr, fn) => {
  for (let idx = 0; idx !== arr.length; idx += 1) {
    if (await fn(arr[idx], idx, arr)) return true;
  }

  return false;
};

const mod = (n, m) => ((n % m) + m) % m;

module.exports = {
  sum,
  hash,
  choose,
  groupByGap,
  restGetURL,
  buildArgs,
  filteredPairs,
  filterObject,
  arrAsyncSome,
  randomToken,
  sha256,
  stableStringify,
  JSONHash,
  mod,
};
