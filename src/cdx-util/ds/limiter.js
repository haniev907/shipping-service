class Limiter {
  /**
   * @param limit {Number}
   * @param meter {Meter}
   * @param slotLimit {Number}
   * */
  constructor(limit, meter, slotLimit = 0) {
    this._limit = limit;
    this.meter = meter;
    this._limitReserve = 0;
    this.slotLimit = slotLimit;
  }

  get limit() {
    return Math.max(0, this._limit - this._limitReserve);
  }

  get remain() {
    return this.limit - this.meter.value;
  }

  get available() {
    const staticLimit = Math.floor(this.limit / this.meter.parts);
    const { remain } = this;
    const limitCorrection = Math.floor(
      remain / Math.min(remain || 1, Math.floor(this.meter.parts / 2)),
    );

    return Math.min(
      (staticLimit + limitCorrection),
      this.slotLimit || Infinity,
    ) - this.meter.curSlotHits;
  }

  reserve(val) {
    this._limitReserve += val;
  }

  free(val) {
    this._limitReserve -= val;
  }

  hit(val = 1) {
    this.meter.hit(val);
  }
}

module.exports = Limiter;
