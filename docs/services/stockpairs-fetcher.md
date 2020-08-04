# Stockpairs fetcher (`services/stockpairs-fetcher.js`)

Сервис отвечает за сбор и хранение пар, для каждой поддерживаемой биржи. Список поддерживаемых бирж указан в `config/constants.js`:

```javascript
config.stocks = ['binance', 'hitbtc'];
```

С определенной периодичностью сервис запрашивает у API биржи список поддерживаемых пар. После чего пары фильтруются таким образом, чтобы обе монеты были с списке поддерживаемых монет (указан в `config/constants.js`):

```javascript
config.currenciesToProcess = {
  binance: [
    'NANO', 'QTUM', 'TUSD', 'VEN', 'WTC',
    'TRX', 'XLM', 'WAVES', 'NEO', 'ADA',
    'BTC', 'ETH', 'XRP', 'EOS', 'USDT',
    'ARK', 'BNB', 'DCR', 'KMD', 'LTC',
    'XEM', 'XMR', 'ZIL',
  ],
  hitbtc: [
    'BTC', 'ETH', 'DASH', 'ZEC', 'XEM',
    'ETC', 'USD',
  ],
};
```

Список получившихся пар сохраняется в базу.

## Диаграмма действий для сервиса

![diag](/docs/images/stockpairs-fetcher.svg)

## Запуск сервиса

```bash
npm run stockpairs-fetcher
```
