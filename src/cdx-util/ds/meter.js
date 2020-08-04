const MS = 1;
const SEC = 1000 * MS;
const MINUTE = 60 * SEC;


class Meter {
  constructor(interval = MINUTE, precision = SEC) {
    this.interval = interval;
    this.precision = precision;
    if (interval % precision !== 0) {
      throw new Error('interval should be divisible by precision.');
    }

    this.parts = this.interval / precision;
    // Two additional slots for partial and full buffer
    this.nSlots = this.parts + 2;
    this.slots = Array(this.nSlots).fill(0);
    this.sum = 0;

    this.offsetTS = Date.now();

    const refreshInterval = Math.floor(this.precision / 2) || 1;

    // Meter has no tearing async handlers.
    // this.destroyed = false;
    this.updateIntervalId = setInterval(() => {
      this.hit(0);
    }, refreshInterval);
  }

  /**
   * @returns {Meter}
   */
  static fromState(interval, precision, offsetTS, slots, sum) {
    const meter = new Meter(interval, precision);
    meter.offsetTS = offsetTS;
    meter.slots = slots;
    meter.sum = sum;

    return meter;
  }

  elapsed() {
    return Date.now() - this.offsetTS;
  }

  get curSlotHits() {
    const curElapsed = this.elapsed();
    const circleInterval = this.nSlots * this.precision;
    const idx = Math.floor((curElapsed % circleInterval) / this.precision);

    return this.slots[idx];
  }

  get value() {
    const curElapsed = this.elapsed();
    const circleInterval = this.nSlots * this.precision;
    const idx = Math.floor((curElapsed % circleInterval) / this.precision);
    const idxP = (idx + 2) % this.nSlots;

    const rightInterval = curElapsed % this.precision;
    const leftInterval = this.precision - rightInterval;
    const middleInterval = Math.min(
      curElapsed - rightInterval,
      this.interval - this.precision,
    );

    const leftHits = this.slots[idxP];
    const leftScale = leftInterval / this.precision;

    const rightHits = this.slots[idx];
    const rightScale = rightInterval / this.precision;

    const middleHits = this.sum - leftHits - rightHits;
    const middleScale = (
      (this.interval - this.precision)
      / (middleInterval || this.precision)
    );

    return leftHits * leftScale + middleHits * middleScale + rightHits * rightScale;
  }

  hit(val = 1) {
    const curElapsed = this.elapsed();
    const circleInterval = this.nSlots * this.precision;
    const idx = Math.floor((curElapsed % circleInterval) / this.precision);

    this.slots[idx] += val;
    const idxNext = (idx + 1) % this.nSlots;

    const buf = this.slots[idxNext];
    this.slots[idxNext] = 0;

    this.sum += (val - buf);
  }

  destroy() {
    // this.destroyed = true;
    clearInterval(this.updateIntervalId);
  }
}

module.exports = Meter;
