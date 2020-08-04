const moment = require('moment');

const Converter = require('./converter');
const SimpleCache = require('./simple-cache');


const TRANSFER = 1;
const TRADE = 2;
const DEPOSIT = 1;
const WITHDRAW = 2;


class FutureProfits {
  constructor(cdx, config) {
    this.cdx = cdx;
    this.config = config;

    this.binanceClient = cdx.stock.binance(
      this.config.constants.binance.apiKey,
      this.config.constants.binance.apiSecret,
    );

    this.convertCache = new SimpleCache(
      async (isoDatetime) => {
        const ohlc = await this.cdx.db.ohlcFutures.getForTimestamp(
          moment.utc(isoDatetime)
            .toDate(),
        );

        return ohlc.reduce(
          (res, el) => Object.assign(
            res, { [el.base]: parseFloat(el.close) },
          ), {},
        );
      },
      this.config.constants.mSecOneHour,
    );
  }

  // This format is used as a key in the OHLC cache (e.g. 2017-06-16T09)
  static timestampToStringDatetime(timestamp) {
    return moment.utc(timestamp)
      .toISOString()
      .slice(0, 13);
  }

  async getActions(keyId) {
    const actions = [];

    const transfers = await this.cdx.db.transfersFutures.getAll(keyId);
    const trades = await this.cdx.db.tradesFutures.getAll(keyId);

    actions.push(
      ...await transfers
        .filter(item => (item.type === WITHDRAW) || (item.type === DEPOSIT))
        .reduce(async (prev, item) => {
          const res = await prev;

          const sign = (item.type === DEPOSIT) ? 1 : -1;

          res.push({
            values: { [item.asset]: sign * item.amount },
            timestamp: moment.utc(item.timestamp)
              .toDate()
              .getTime(),
            actionType: TRANSFER,
          });

          return res;
        }, Promise.resolve([])),
    );

    actions.push(
      ...await trades
        .reduce(
          async (prev, item) => {
            const res = await prev;
            const { base, quote } = await this.binanceClient.splitFuturePair(item.symbol);

            const sign = (item.side === 'BUY') ? 1 : -1;
            const values = {};
            values[base] = (values[base] || 0) + sign * Number.parseFloat(item.qty);
            values[quote] = (values[quote] || 0) - sign * Number.parseFloat(item.quoteQty);
            values[item.commissionAsset] = (values[item.commissionAsset] || 0)
              - Number.parseFloat(item.commission);

            res.push({
              values,
              timestamp: moment.utc(item.time)
                .toDate()
                .getTime(),
              actionType: TRADE,
            });

            return res;
          },
          Promise.resolve([]),
        ),
    );

    return actions.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getProfits(actions) {
    let balances = [];
    let profits = [];

    const saveProfit = (timestamp) => {
      const prev = Math.max(0, balances.length - 2);
      const cur = balances.length - 1;

      profits.push({
        timestamp,
        balCur: cur,
        balPrev: prev,
      });
    };

    const processAction = async (action) => {
      if (action.actionType === TRADE) {
        if (balances.length === 0) {
          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, action.values),
          });
          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, action.values),
          });
        } else {
          const lastDay = moment.utc(balances[balances.length - 1].timestamp)
            .startOf('day');
          const curDay = moment.utc(action.timestamp)
            .startOf('day');

          if (lastDay.isBefore(curDay)) {
            saveProfit(curDay.toDate().getTime());

            balances.push({
              timestamp: action.timestamp,
              values: Object.assign({}, balances[balances.length - 1].values),
            });
          }

          Object.entries(action.values).forEach(([asset, value]) => {
            balances[balances.length - 1].values[asset] = (
              balances[balances.length - 1].values[asset] || 0
            ) + value;
          });
        }
      } else if (action.actionType === TRANSFER) {
        if (balances.length === 0) {
          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, action.values),
          });
          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, action.values),
          });
        } else {
          saveProfit(action.timestamp);

          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, balances[balances.length - 1].values),
          });
          Object.entries(action.values).forEach(([asset, value]) => {
            balances[balances.length - 1].values[asset] = (
              balances[balances.length - 1].values[asset] || 0
            ) + value;
          });
          balances.push({
            timestamp: action.timestamp,
            values: Object.assign({}, balances[balances.length - 1].values),
          });
        }
      }
    };

    await actions.reduce(async (chain, action) => {
      await chain;
      await processAction(action);
    }, Promise.resolve());

    balances = await balances.reduce(
      async (prev, bal) => {
        const res = await prev;

        const convertTimestamp = FutureProfits.timestampToStringDatetime(bal.timestamp);
        const convert = new Converter(this.convertCache, convertTimestamp);
        await convert.init();

        res.push({
          timestamp: bal.timestamp,
          value: Object.entries(bal.values)
            .reduce(
              (sum, [asset, value]) => (
                sum + convert.get(asset) * value
              ), 0,
            ),
        });

        return res;
      }, Promise.resolve([]),
    );

    profits = profits
      .map(profit => ({
        timestamp: profit.timestamp,
        value: (balances[profit.balCur].value / balances[profit.balPrev].value - 1),
      }));
    profits = profits
      .reduce((res, profit) => {
        let { value } = profit;
        if (Number.isNaN(value)) {
          value = 0;
        }

        res.push({
          timestamp: profit.timestamp,
          value: (1 + value) * res[res.length - 1].value
        });

        return res;
      }, [{ value: 1 }])
      .slice(1);

    return {
      balances,
      profits,
    };
  }
}

module.exports = FutureProfits;
