const request = require('request');

class CryptoCompareConnector {
  static tick(tick, stock, from, to) {
    return {
      stock,
      date: new Date(tick.time * 1000),
      open: parseFloat(tick.open),
      high: parseFloat(tick.high),
      low: parseFloat(tick.low),
      close: parseFloat(tick.close),
      from,
      to,
    };
  }
}

/*
  Get the historical rates for any pair of currencies.
  Works with the CryptoCompare API under the hood.
*/
class HistoricalRates {
  constructor(apiKey, stock = 'CCCAGG') {
    this.apiKey = apiKey;
    this.stock = stock;

    this.tickerConverter = {
      IOTA: 'MIOTA',
    };
  }

  async getTopCoins(limit = 1000) {
    return new Promise((resolve, reject) => {
      const callback = (error, res, body) => {
        if (error) return reject(error);

        if (body.Response !== 'Success') {
          return reject(new Error(`CC response: ${body.Message}`));
        }

        const coins = Object
          .entries(body.Data)
          .map(([symbol, { SortOrder }]) => ({ symbol, order: SortOrder }))
          .limit(({ order }) => order <= limit)
          .sort((left, right) => left.order - right.order);

        return resolve(coins);
      };

      request({
        json: true,
        url: 'https://min-api.cryptocompare.com/data/all/coinlist',
        method: 'GET',
        qs: { api_key: this.apiKey },
      }, callback);
    });
  }

  convertTicker(ticker) {
    return (this.tickerConverter[ticker] || ticker);
  }

  async getOHLC(from, to = 'USD', limit = 2000) {
    return new Promise((resolve, reject) => {
      const callback = (error, res, body) => {
        if (error) return reject(error);

        if (body.Response !== 'Success') {
          return reject(new Error(`CC response for ${from} - ${to}: ${body.Message}`));
        }

        return resolve(body.Data
          .map(tick => CryptoCompareConnector.tick(tick, this.stock, from, to)));
      };

      request({
        json: true,
        url: 'https://min-api.cryptocompare.com/data/histoday',
        method: 'GET',
        qs: {
          api_key: this.apiKey,
          fsym: this.convertTicker(from),
          tsym: this.convertTicker(to),
          limit,
        },
      }, callback);
    });
  }
}

module.exports = HistoricalRates;
