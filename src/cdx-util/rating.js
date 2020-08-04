/**
 * Represents the Cindx rating object.
 */
class Rating {
  /**
   * @param {object} state Latest known state
   *
   * @param {number} state.nTicks Total number of ticks
   * @param {number} state.incomeAverage (IAV)
   * @param {number} state.maxDrawdown Maximum Drawdown (MaxDD)
   * @param {number} state.maxRecoveryTimeShare aka DMaxDD
   *
   * @param {object} state.volatilityState State with params for calculating variance (Vol)
   * @param {number} state.volatilityState.linSum Sum of the changes
   * @param {number} state.volatilityState.sqrSum Sum of the squares of the changes
   *
   * @param {Tick} state.allTimeHigh ATH
   * @param {Tick} state.lastTick Last saved tick
   * @param {Tick} state.firstTick First saved tick
   */
  constructor(state) {
    this.state = {
      isEmpty: state.isEmpty,
      firstTick: state.firstTick,
      lastTick: state.lastTick,
      allTimeHigh: state.allTimeHigh,
      nTicks: state.nTicks,
      incomeAverage: state.incomeAverage,
      incomeAccumulated: state.incomeAccumulated,
      maxDrawdown: state.maxDrawdown,
      maxRecoveryTimeShare: state.maxRecoveryTimeShare,
      maxRecoveryTimeShareTimeDiff: state.maxRecoveryTimeShareTimeDiff,
      volatilityState: state.volatilityState,
    };
  }

  /**
   * Initialize the rating object from the tick.
   * Should be used in case, when there's no state value and you
   * need to calculate the rating from the scratch.
   *
   * const r = Rating.fromTick(tick);
   * r.addTick(newTick); <-- Here's the call
   *
   * @param {Tick} tick
   */
  static fromTick(tick) {
    const tickCopy = tick.clone();

    const state = {
      isEmpty: (tick.value === 0),
      firstTick: tickCopy,
      lastTick: tickCopy,
      allTimeHigh: tickCopy,
      nTicks: 1,
      incomeAverage: 0.0,
      incomeAccumulated: 1.0,
      maxDrawdown: 0.0, // MaxDD
      maxRecoveryTimeShare: 0.0, // aka DMaxDD
      maxRecoveryTimeShareTimeDiff: 0.0,
      volatilityState: { linSum: 0.0, sqrSum: 0.0 }, // volatile is variance
    };

    return new Rating(state);
  }

  /**
   * Apply new tick to the state.
   *
   * @param {Tick} tick
   * @param {Number} transferValue
   */
  addTick(tick, transferValue) {
    const tickCopy = tick.clone();

    let relChange = tick.value / ((this.state.lastTick.value) + transferValue) - 1.0;
    relChange = Number.isFinite(relChange) ? relChange : 0.0;

    const nChanges = this.state.nTicks - 1;

    // Copy the previous state
    // - It may be helpfull if you're still in the 'isEmpty = true' gap
    // - Otherwise you will replace the old values anyway
    const newState = new Rating(this.state).state;

    newState.isEmpty = (this.state.isEmpty === false) ? false : (tick.value === 0);

    // The balances are still looks like 0,0,0..., so don't update the rating metrics
    if (newState.isEmpty === true) {
      newState.lastTick = tickCopy;

      this.state = newState;
      return;
    }

    newState.nTicks = this.state.nTicks + 1;
    newState.incomeAverage = (this.state.incomeAverage * nChanges + relChange) / (nChanges + 1);
    newState.incomeAccumulated = (1 + relChange) * this.state.incomeAccumulated;

    const tickInShare = {
      value: newState.incomeAccumulated,
      timestamp: tick.timestamp,
    };

    newState.maxDrawdown = Math.max(
      this.state.maxDrawdown,
      this.state.allTimeHigh.value < tickInShare.value
        ? 0 : Math.abs(tickInShare.value / this.state.allTimeHigh.value - 1),
    ) || 0.0;

    newState.maxRecoveryTimeShareTimeDiff = Math.max(
      this.state.maxRecoveryTimeShareTimeDiff,
      this.state.allTimeHigh.value < tickInShare.value
        ? 0 : (tickInShare.timestamp - this.state.allTimeHigh.timestamp),
    );

    newState.maxRecoveryTimeShare = (
      newState.maxRecoveryTimeShareTimeDiff
      / (tickInShare.timestamp - this.state.firstTick.timestamp)
    ) || 0.0;

    newState.volatilityState = {
      linSum: this.state.volatilityState.linSum + relChange,
      sqrSum: this.state.volatilityState.sqrSum + (relChange ** 2),
    };

    newState.allTimeHigh = (this.state.allTimeHigh.value > tickInShare.value)
      ? this.state.allTimeHigh
      : tickInShare;

    newState.firstTick = this.state.firstTick;
    newState.lastTick = tickCopy;

    this.state = newState;
  }

  /**
   * @returns {number}
   */
  get nTicks() {
    return this.state.nTicks;
  }

  /**
   * @returns {number}
   */
  get incomeAverage() {
    return this.state.incomeAverage;
  }

  /**
   * @returns {number}
   */
  get maxDrawdown() {
    return this.state.maxDrawdown;
  }

  /**
   * @returns {number}
   *
   * Calculates and returns the Max Recovery Time Share (DmaxDD) metric for current state.
   */
  get maxRecoveryTimeShare() {
    return this.state.maxRecoveryTimeShare;
  }

  /**
   * @returns {number}
   */
  get volatilitySqr() {
    const correctedN = Math.max(1, this.state.nTicks - 2);

    if (correctedN === 1) return 1;

    return (
      this.state.volatilityState.sqrSum
      - (this.state.volatilityState.linSum ** 2) / correctedN
    ) / correctedN;
  }

  /**
   * @returns {Date}
   */
  get timestamp() {
    return this.state.lastTick.timestamp.toDate();
  }

  /*
    Get the rating for the current state or return NaN is there's no state.

    @return {number} Rating value
  */
  get ratingValue() {
    return this.incomeAverage / (this.maxDrawdown + this.maxRecoveryTimeShare + this.volatilitySqr);
  }
}

module.exports = Rating;
