class Tick {
  /**
   * @param {number} value in base currency (USD/BTC)
   * @param {object} timestamp - Date object
   */
  constructor(value, timestamp) {
    this.value = value;
    this.timestamp = timestamp;
  }

  clone() {
    return new Tick(this.value, new Date(this.timestamp));
  }
}

module.exports = Tick;
