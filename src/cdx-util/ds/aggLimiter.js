const Limiter = require('./limiter');


class AggLimiter extends Limiter {
  /**
   * @param limiter {Limiter}
   * @param meter {Meter}
   * @param slotLimit {Number}
   * */
  constructor(limiter, meter, slotLimit = 0) {
    super(0, meter, slotLimit);

    this._limiter = limiter;
  }

  get limit() {
    return Math.max(0, this._limiter.available - this._limitReserve);
  }

  hit(val = 1) {
    this.meter.hit(val);
    this._limiter.hit(val);
  }
}

module.exports = AggLimiter;
