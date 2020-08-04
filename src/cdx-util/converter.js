class Converter {
  constructor(convertCache, timestamp) {
    this.timestamp = timestamp;
    this.convertCache = convertCache;
  }

  async init() {
    this.convert = await this.convertCache.get(this.timestamp);
    this.length = Object.keys(this.convert).length;
  }

  get(symbol) {
    const rate = this.convert[symbol];

    if (rate === undefined) {
      return 0.0;
    }

    return rate;
  }
}

module.exports = Converter;
