const { arrAsyncSome } = require('./common');

function convertReducer(res, {
  from,
  to,
  price,
  ask,
  bid,
}) {
  res.set(`${from}:${to}`, { price, ask, bid });
  return res;
}

/**
 * getZeroBalance - Retuns zero balance in a general form
 *
 * @return {Object}   Zero balance for hold & available
 */
function getZeroBalance() {
  return ({ available: 0.0, hold: 0.0 });
}


/**
 * totalWorthReducer - Reducer for converting the balance in a form of
 * [{"value": 1, "rateUSD": 10}, {"value": 2, "rateUSD": 0.5}] to the total
 * accumulated value.
 *
 * @param  {number} total     Reducer accumulator
 * @param  {number} value     Value in some currency
 * @param  {number} rateUSD   Rate for currency to USD
 * @return {number}           Total worth of the balance
 */
function totalWorthReducer(total, { available, hold, price }) {
  return {
    available: total.available + available * price,
    hold: total.hold + hold * price,
  };
}


/**
 * totalWorthUSD - Get the user's balance value in USD
 *
 * @param  {Object} balances User's balances e.g. {BTC: {value: 1, rateUSD: 10}}
 * @return {number}          Total worth of the balance in USD
 */
function totalWorth(balances) {
  return Object
    .values(balances)
    .reduce(totalWorthReducer, getZeroBalance());
}

/**
 * mergeUSDValues - regroup the array of price object into one object,
 * by summing the values with the same field.
 *
 * @param  {array} values           Array of values objects
 * @param  {object} values.bid    Bid price
 * @param  {object} values.ask    Ask price
 * @param  {object} values.price  Price
 * @return {object}               Merged values
 */
function mergeUSDValues(values) {
  const merged = {};
  const fieldCounter = {};

  // Sum all non-undefined values
  values.forEach((valueObj) => {
    Object.entries(valueObj).forEach(([field, value]) => {
      if (value === undefined) return;

      merged[field] = (merged[field] || 0) + value;
      fieldCounter[field] = (fieldCounter[field] || 0) + 1;
    });
  });

  // Get the average for each field
  const average = Object.entries(merged).reduce((acc, [field, value]) => {
    const averageValue = value / fieldCounter[field];

    return {
      ...acc,
      [field]: averageValue,
    };
  }, {});

  return average;
}

/**
 * getUSDValue - Get USD price for some pair, according to the rates,
 * given in the `convert` object. If converter object have a direct price for
 * symbol in USD or any other USD-like currency - just returns it. Otherwise,
 * search some
 *
 * @param  {Object} convert description
 * @param  {type} symbol  description
 * @return {type}         description
 */
function getUSDValue(config, convert, symbol) {
  if (symbol === 'USD') return { ask: 1, price: 1, bid: 1 };

  const directUsd = config.constants.usdCoins.find(
    usdSymbol => convert.has(`${symbol}:${usdSymbol}`),
  );

  // Check that converter has direct path for symbol with some USD-like currency
  if (directUsd !== undefined) return convert.get(`${symbol}:${directUsd}`);

  const reversedUsd = config.constants.usdCoins.find(
    usdSymbol => convert.has(`${usdSymbol}:${symbol}`),
  );

  // Check that converter has reversed path for symbol with some USD-like currency
  if (reversedUsd !== undefined) return convert.get(`${reversedUsd}:${symbol}`);

  const usdValues = (['BTC', 'ETH', 'BNB']).reduce((res, interSym) => {
    if (!convert.has(`${symbol}:${interSym}`)) return res;

    const pairs = config.constants.usdCoins.reduce((pairsRes, usdCoin) => {
      const pair = `${interSym}:${usdCoin}`;

      if (!convert.has(pair)) return pairsRes;

      pairsRes.push(Object.keys(convert.get(`${symbol}:${interSym}`)).reduce((result, field) => {
        const fieldValue = convert.get(`${symbol}:${interSym}`)[field] * convert.get(pair)[field];

        return {
          ...result,
          [field]: fieldValue,
        };
      }, {}));

      return pairsRes;
    }, []);

    return res.concat(pairs);
  }, []);

  // No ways to convert currency to the USD :C
  if (usdValues.length === 0) return undefined;

  // For the case, when we have a multiple ways to convert currency to the USD
  // returns the average sum (pretty useful in case USDT costs 0.95 and TUSD costs 1.05)
  // Remember, that we're searching for average for each field (price, bid, ask)
  // So first, we need to merge values field-by-field
  const mergedUsdValues = mergeUSDValues(usdValues);

  return mergedUsdValues;
}

function getBTCValue(config, convert, symbol) {
  if (symbol === 'BTC') return { ask: 1, price: 1, bid: 1 };

  // - Direct pair exists
  let pair = `${symbol}:BTC`;
  if (convert.has(pair)) return convert.get(pair);

  // - Check for reversed pair
  pair = `BTC:${symbol}`;
  if (convert.has(pair)) {
    const directRates = convert.get(pair);

    // Check that the price is not 0 or infinite
    if (
      directRates.price === 0
      || !Number.isFinite(directRates.price)
    ) return undefined;

    // -- Reverse values in this case
    const reversedRates = {
      price: 1 / directRates.price,
    };

    if (directRates.bid !== 0
      && Number.isFinite(directRates.bid)
    ) reversedRates.bid = 1 / directRates.bid;

    if (directRates.ask !== 0
      && Number.isFinite(directRates.ask)
    ) reversedRates.ask = 1 / directRates.ask;

    return reversedRates;
  }

  return undefined;
}

function rateGetter(config, convert, symbol, currencyToEstimate = null) {
  return (
    (currencyToEstimate || config.constants.currencyToEstimate) === 'BTC'
  )
    ? getBTCValue(config, convert, symbol)
    : getUSDValue(config, convert, symbol);
}

/**
 * fetchKeyIdData - Get the following data about the user:
 * - stock (binance, hitbtc, etc)
 * - client (for stock, obviously)
 * - convert (Object in a form {"ETHBTC": 10}. Value means pair price)
 * - balances (available values for each currency in his balance)
 *
 * @param  {string} keyId description
 * @return {Object}       description
 */
async function fetchKeyIdData(
  cdx, config, keyId,
  globalStockClients = null,
  currencyToEstimate = null,
  balanceFromDB = false,
  limiter = null,
  ctxProxy = (async (_, fn, ...args) => fn(...args)),
  evMode = 0,
) {
  const key = await cdx.db.apikey.getKeyCredentials(keyId);
  const client = cdx.stock[key.stock](key.apiKey, key.apiSecret, limiter);

  // Ticks may be get directly from the db, or from the wrapper
  // - In the second case, the insufficiency of the ticks is checked
  let ticksFn;
  if (globalStockClients === null) {
    ticksFn = async () => cdx.db.latestTick.getLatestTicks(key.stock);
  } else {
    ticksFn = async () => cdx.db.wrapper.getLatestTicks(
      cdx, key.stock, globalStockClients[key.stock],
    );
  }

  const ticks = await ctxProxy(
    config.events.following.ticks.default + evMode,
    ticksFn,
  );

  const convert = ticks.reduce(convertReducer, new Map());

  const balancesData = await ctxProxy(
    config.events.following.balancesData.default + evMode,
    cdx.db.wrapper.getKeyIdBalances,
    cdx, client, keyId, null, balanceFromDB,
  );

  const balancesReducer = (res, [symbol, [available, hold]]) => {
    const rate = rateGetter(config, convert, symbol, currencyToEstimate);

    if (rate === undefined) return res;

    return Object.assign(res, {
      [symbol]: {
        available: available || 0.0,
        hold: hold || 0.0,
        ...rate,
      },
    });
  };

  const balances = Object
    .entries(balancesData)
    .reduce(balancesReducer, {});

  return {
    stock: key.stock,
    client,
    convert,
    balances,
    keyId,
  };
}

async function getFollowingQuality(cdx, config, follower, leader) {
  const publicClients = {
    binance: cdx.stock.binance(
      config.constants.binance.apiKey,
      config.constants.binance.apiSecret,
    ),
  };

  const followerObj = await fetchKeyIdData(cdx, config, follower, publicClients);
  const leaderObj = await fetchKeyIdData(cdx, config, leader, publicClients);

  const followerTotal = totalWorth(followerObj.balances);
  const leaderTotal = totalWorth(leaderObj.balances);

  const ratio = (followerTotal.available + followerTotal.hold)
    / (leaderTotal.available + leaderTotal.hold);

  const targetBalanceReducer = (
    (res, [symbol, { available, hold }]) => Object
      .assign(res, { [symbol]: { available: available * ratio, hold: hold * ratio } })
  );

  // Apply ratio on the leader's balances
  const targetBalances = Object
    .entries(leaderObj.balances)
    .reduce(targetBalanceReducer, {});

  const quality = Object
    .entries(targetBalances)
    .map(([coin, { available, hold }]) => {
      const {
        price,
        available: followerAvailable,
        hold: followerHold,
      } = followerObj.balances[coin];

      // - Filter out coins, which are "empty" for both leader and follower
      if (available === 0
          && hold === 0
          && followerAvailable === 0
          && followerHold === 0) return null;

      return [
        coin,
        price * (followerAvailable + followerHold),
        price * (available + hold),
      ];
    })
    .filter(q => q !== null)
    .reduce((res, [_coin, followerBalance, targetBalance]) => {
      const error = (followerBalance / (followerTotal.available + followerTotal.hold))
        - (targetBalance / (followerTotal.available + followerTotal.hold));

      return res + 100 * Math.abs(error);
    }, 0);

  return (200 - quality) / 2;
}

/**
 * buildOrder - Checks that order is valid and creates it.
 *
 * @param  {string} from  From symbol, e.g. ETH
 * @param  {string} to    To symbol, e.g. BTC
 * @param  {number} price Order price
 * @param  {number} qty   Order quantity
 * @param  {string} side  Order side (SELL / BUY)
 * @param  {boolean} transit order
 * @return {object}       Order object or undefined
 */
async function buildOrder(
  config,
  follower, client, logger,
  from, to, price, qty, side,
  transit = false, orderType = 'MARKET',
  stopPrice = 0.0,
) {
  try {
    const order = await client
      .prepareOrder(from, to, qty, price, transit, orderType, stopPrice);

    return Object.assign(order, {
      price,
      side,
      base: from,
      quote: to,
      source: ({ SELL: from, BUY: to })[side],
      drain: ({ SELL: to, BUY: from })[side],
    });
  } catch (err) {
    logger.debug(
      'prepare-order-error',
      {
        err: err.message,
        from,
        to,
        price,
        qty,
        side,
        transit,
        orderType,
        stopPrice,
      },
      config.logging.following.worker.copy,
    );

    return undefined;
  }
}

async function getOrderBalances(order, client, reversed = false) {
  const {
    symbol: pair,
    side,
    price: priceStr,
    quantity: quantityStr,
  } = order;

  const { base, quote } = await client.splitPair(pair);
  const price = parseFloat(priceStr);
  const quantity = parseFloat(quantityStr) * (reversed ? -1.0 : 1.0);

  let baseQty = quantity;
  let quoteQty = price * quantity;

  if (side === 'SELL') {
    baseQty *= -1.0;
  } else if (side === 'BUY') {
    quoteQty *= -1.0;
  } else {
    throw Error(`Invalid side: ${side}`);
  }

  return [
    [[base], baseQty],
    [[quote], quoteQty],
  ];
}

async function ordersToBalances(orders, client) {
  const reducer = async (prev, order) => {
    const cur = await prev;

    return [...cur, ...await getOrderBalances(order, client)];
  };

  return orders.reduce(reducer, Promise.resolve([]));
}

async function qualityErrorsSum(config, check, target, convert) {
  const symbols = new Set(
    Object.keys(check)
      .concat(Object.keys(target)),
  );

  const reducer = (res, symbol) => {
    const rate = rateGetter(config, convert, symbol);

    if (rate === undefined) return res;

    return res + Math.abs(
      (target[symbol] || 0.0) - (check[symbol] || 0.0),
    ) * rate.price;
  };

  return Array
    .from(symbols)
    .reduce(reducer, 0.0);
}

function miscDiffScore(check, target) {
  const init = { counts: {}, stopPrices: {} };

  const addToGroup = (store, group, val) => Object.assign(
    store, { [group]: (store[group] || 0) + val },
  );

  const getReducer = (sign = 1) => (res, order) => {
    switch (order.type) {
      case 'LIMIT':
        addToGroup(res.counts, 'limit', sign);
        break;
      case 'MARKET':
        addToGroup(res.counts, 'market', sign);
        break;
      case 'STOP_LOSS_LIMIT':
      case 'TAKE_PROFIT_LIMIT':
        addToGroup(res.counts, 'stop', sign);
        addToGroup(res.stopPrices, order.symbol, order.stopPrice * sign);
        break;
      default:
        break;
    }

    return res;
  };

  const targetMetrics = target.reduce(getReducer(1), Object.assign({}, init));
  const metricsDiff = check.reduce(getReducer(-1), Object.assign({}, targetMetrics));

  const metricSum = metric => (
    Object.values(metric)
      .reduce((sum, diff) => sum + Math.abs(diff), 0)
  );

  return {
    countScore: metricSum(metricsDiff.counts),
    stopScore: metricSum(metricsDiff.stopPrices),
  };
}

async function injectPriceToMarketOrders(client, convert, orders) {
  const mapper = async (order) => {
    if (order.type !== 'MARKET') return order;

    const { base, quote } = await client.splitPair(order.symbol);
    const convertKey = `${base}:${quote}`;

    if (order.side === 'BUY') {
      return Object.assign(order, { price: convert.get(convertKey).ask });
    }

    if (order.side === 'SELL') {
      return Object.assign(order, { price: convert.get(convertKey).bid });
    }

    throw Error('Invalid order side');
  };

  const promises = orders.map(mapper);

  return Promise.all(promises);
}

function followingOrdersCompareFn(left, right) {
  return right.quantity * right.price - left.quantity * left.price;
}

async function copyFollowing(
  config, cdx, logger,
  globalStockClients, followingId,
  followerObj, leaderObj, ratio,
  ctxProxy = (async (_, fn, ...args) => fn(...args)),
) {
  const mapperAvailablePlusHold = (
    ([symbol, { available, hold }]) => [symbol, available + hold]
  );
  const getReducerTotalBalance = ($ratio = 1.0) => (
    (res, [symbol, val]) => Object.assign(
      res, {
        [symbol]: (res[symbol] || 0.0) + val * $ratio,
      },
    )
  );

  const pubClient = globalStockClients[leaderObj.stock];
  const ticks = await ctxProxy(
    config.events.following.cf.ticks,
    cdx.db.wrapper.getLatestTicks,
    cdx, leaderObj.stock, pubClient,
  );

  const convert = ticks.reduce(convertReducer, new Map());

  const followerActiveOrders = (
    await ctxProxy(
      config.events.following.cf.activeOrders.follower,
      cdx.db.order.getKeyIdActiveOrders.bind(cdx.db.order),
      followerObj.stock, followerObj.keyId,
    )
  ).sort(followingOrdersCompareFn);

  const followerOrderBalances = await ctxProxy(
    config.events.following.cf.orderBalances.follower,
    ordersToBalances,
    followerActiveOrders, pubClient,
  );

  const followerBalances = Object
    .entries(followerObj.balances)
    .map(mapperAvailablePlusHold)
    .concat(followerOrderBalances);
  const followerTotalBalances = followerBalances
    .reduce(getReducerTotalBalance(), {});

  const leaderActiveOrders = (
    await ctxProxy(
      config.events.following.cf.activeOrders.leader,
      cdx.db.order.getKeyIdActiveOrders.bind(cdx.db.order),
      leaderObj.stock, leaderObj.keyId,
    )
  ).sort(followingOrdersCompareFn);

  const leaderRawRecentlyFilledOrders = await ctxProxy(
    config.events.following.cf.recentlyFilledOrdersRaw,
    cdx.db.order.getKeyIdRecentlyFilledOrders.bind(cdx.db.order),
    leaderObj.stock, leaderObj.keyId,
  );

  const leaderRecentlyFilledOrders = (
    await ctxProxy(
      config.events.following.cf.recentlyFilledOrders,
      injectPriceToMarketOrders,
      pubClient, convert, leaderRawRecentlyFilledOrders,
    )
  ).sort(followingOrdersCompareFn);

  const leaderOrders = [...leaderRecentlyFilledOrders, ...leaderActiveOrders];

  const leaderOrderBalances = await ctxProxy(
    config.events.following.cf.orderBalances.leader,
    ordersToBalances,
    leaderActiveOrders, pubClient,
  );

  const targetTotalBalances = Object
    .entries(leaderObj.balances)
    .map(mapperAvailablePlusHold)
    .concat(leaderOrderBalances)
    .reduce(getReducerTotalBalance(ratio), {});

  const curError = await ctxProxy(
    config.events.following.cf.curError,
    qualityErrorsSum,
    config, followerTotalBalances, targetTotalBalances,
    followerObj.convert,
  );

  logger.info(
    'current-error',
    { curError },
    config.logging.following.worker.copy,
  );

  const miscDiff = miscDiffScore(followerActiveOrders, leaderOrders);

  const getCancelOrderReducer = (nextOrder = null) => async (prev, order) => {
    const cur = await prev;

    const minusOrderBalances = Object.entries(
      (await getOrderBalances(order, pubClient, true))
        .reduce(getReducerTotalBalance(), {}),
    );
    const balances = minusOrderBalances.slice();

    if (nextOrder !== null) {
      /*
        Manually build order with applied ratio, because ratio in getReducerTotalBalance
        will not consider pair step, min notional and other filters,
        thus will lead to significant error in estimation.
      */
      const { base, quote } = await pubClient.splitPair(nextOrder.symbol);
      const correctedOrder = await buildOrder(
        config,
        null, pubClient, logger,
        base, quote,
        nextOrder.price, nextOrder.quantity * ratio,
        nextOrder.side, false,
        nextOrder.orderType, nextOrder.stopPrice,
      );

      if (correctedOrder === undefined) {
        return cur;
      }

      const plusOrderBalances = Object.entries(
        (await getOrderBalances(correctedOrder, pubClient))
          .reduce(getReducerTotalBalance(), {}),
      );
      balances.push(...plusOrderBalances);
    }

    const followerTotalBalancesWithoutOrder = followerBalances
      .concat(balances)
      .reduce(getReducerTotalBalance(), {});

    const followerOrdersWithoutOrder = followerActiveOrders
      .filter(curOrder => curOrder.orderId !== order.orderId)
      .concat(nextOrder || []);

    const errorWithoutOrder = await qualityErrorsSum(
      config, followerTotalBalancesWithoutOrder, targetTotalBalances,
      followerObj.convert,
    );
    const miscDiffWithoutOrder = miscDiffScore(
      followerOrdersWithoutOrder, leaderOrders,
    );

    const countScoreImproved = miscDiffWithoutOrder.countScore < miscDiff.countScore;
    const countScoreDegraded = miscDiffWithoutOrder.countScore > miscDiff.countScore;
    const stopScoreImproved = miscDiffWithoutOrder.stopScore < miscDiff.stopScore;
    const stopScoreDegraded = miscDiffWithoutOrder.stopScore > miscDiff.stopScore;
    const errorDiff = errorWithoutOrder - curError;
    const errorScoreDegraded = (
      errorDiff > config.constants.estimateCurrencyDelta
      && errorDiff > curError * config.constants.significanceCoeff
    );
    const errorScoreImproved = (
      0 - errorDiff > config.constants.estimateCurrencyDelta
      && 0 - errorDiff > curError * config.constants.significanceCoeff
    );

    const miscImprove = (countScoreImproved || stopScoreImproved) && !errorScoreDegraded;
    const errorImprove = errorScoreImproved && !countScoreDegraded && !stopScoreDegraded;

    if (!miscImprove && !errorImprove) {
      return cur;
    }

    const fn = (curOrder => async () => {
      const cancelErr = await followerObj.client.cancelOrder(
        curOrder.symbol, order.orderId,
      );

      logger.info(
        'order-cancel',
        {
          order,
          status: !cancelErr,
          error: !cancelErr ? '' : cancelErr.body,
        },
        config.logging.following.worker.copy,
      );

      if (cancelErr) return false;

      await cdx.db.order.updateStatus(
        followerObj.stock, followerObj.keyId, curOrder.orderId,
        'CANCELED',
      );

      return true;
    })(order);

    return cur.concat({ fn, error: errorWithoutOrder });
  };

  const createOrdersReducer = async (prev, order) => {
    const cur = await prev;

    const followerOrdersWithOrder = followerActiveOrders.concat(order);
    const miscDiffWithOrder = miscDiffScore(
      followerOrdersWithOrder, leaderOrders,
    );

    if (miscDiffWithOrder.countScore > miscDiff.countScore) {
      return cur;
    }

    if (miscDiffWithOrder.stopScore > miscDiff.stopScore) {
      return cur;
    }

    const { base, quote } = await pubClient.splitPair(order.symbol);
    const qtyCoeffs = [1.0, 0.995];
    const store = { newOrder: {}, mul: 1.0 };

    const filter = async (mul) => {
      const targetQty = order.quantity * ratio * mul;
      let qty = 0.0;

      if (order.side === 'SELL') {
        qty = Math.min(targetQty, followerObj.balances[base].available);
      }

      if (order.side === 'BUY') {
        qty = Math.min(targetQty, followerObj.balances[quote].available / order.price);
      }

      store.newOrder = await buildOrder(
        config,
        followerObj.keyId, pubClient, logger,
        base, quote, order.price, qty, order.side,
        false, order.type, order.stopPrice,
      );
      store.mul = mul;

      return (store.newOrder !== undefined);
    };

    const canBuildOrder = await arrAsyncSome(qtyCoeffs, filter);

    if (!canBuildOrder) {
      return cur;
    }

    const orderBalances = Object.entries(
      (await getOrderBalances(order, pubClient))
        .reduce(getReducerTotalBalance(ratio * store.mul), {}),
    );

    const followerTotalBalancesWithOrder = followerBalances
      .concat(orderBalances)
      .reduce(getReducerTotalBalance(), {});

    const errorWithOrder = await qualityErrorsSum(
      config, followerTotalBalancesWithOrder, targetTotalBalances,
      followerObj.convert,
    );

    if (errorWithOrder >= curError) {
      return cur;
    }

    const fn = (newOrder => async () => {
      const newOrderResponse = await followerObj.client.order(newOrder);

      logger.info(
        'order-limit',
        {
          order,
          status: !newOrderResponse.error,
          error: !newOrderResponse.error ? '' : newOrderResponse.error.body,
        },
        config.logging.following.worker.copy,
      );

      if (newOrderResponse.error) {
        await cdx.db.followingLog.setDeferedLog(
          followingId,
          order.symbol,
          order.orderId,
        );

        return false;
      }

      await cdx.db.order.update(
        followerObj.stock, followerObj.keyId, newOrderResponse.response.orderId,
        order.symbol, order.side, order.type, 'GTC', order.quantity, order.price, 0,
        'NEW', order.time, order.updateTime,
        // We will consider all open orders in advance DB updates as 'NEW',
        // even market ones, it doesn't breaks our logic.
      );

      await cdx.db.followingLog.setCopiedLog(
        followingId,
        order.symbol,
        order.orderId,
        newOrderResponse.response.orderId,
      );

      await cdx.db.following.updateFollowingLog(
        followingId,
        'following-rebalance-end',
        { newOrderResponse: newOrderResponse.error, newOrder: store.newOrder },
      );

      return true;
    })(store.newOrder);

    return cur.concat({ fn, error: errorWithOrder });
  };

  const operations = [];

  // First check for outdated active follower orders.
  // TODO: Deeper decomposition with ctxProxy could be required.
  const cancelOperations = await ctxProxy(
    config.events.following.cf.cancelOperations,
    Array.prototype.reduce.bind(followerActiveOrders),
    getCancelOrderReducer(),
    Promise.resolve([]),
  );
  operations.push(...cancelOperations);

  // Then try to create a new order
  // TODO: Deeper decomposition with ctxProxy could be required.
  const createOperations = await ctxProxy(
    config.events.following.cf.createOperations,
    Array.prototype.reduce.bind(leaderOrders),
    createOrdersReducer,
    Promise.resolve([]),
  );
  operations.push(...createOperations);

  const compositeOrderReducer = async (prev, nextOrder) => {
    const cur = await prev;

    const ops = await followerActiveOrders.reduce(
      getCancelOrderReducer(nextOrder),
      Promise.resolve([]),
    );

    return cur.concat(ops);
  };

  // TODO: Deeper decomposition with ctxProxy could be required.
  const compositeOperations = await ctxProxy(
    config.events.following.cf.compositeOperations,
    Array.prototype.reduce.bind(leaderOrders),
    compositeOrderReducer,
    Promise.resolve([]),
  );
  operations.push(...compositeOperations);

  operations.sort((a, b) => a.error - b.error);

  if (operations.length !== 0) {
    await operations[0].fn();
    return true;
  }

  return followerActiveOrders.length !== 0;
}

module.exports = {
  totalWorth,
  getZeroBalance,
  totalWorthReducer,
  mergeUSDValues,
  getUSDValue,
  getBTCValue,
  rateGetter,
  fetchKeyIdData,
  getFollowingQuality,
  copyFollowing,
  buildOrder,
};
