const { hash } = require('./common');

class SimpleCache {
  /**
   * @param {function} fetchFn - function with key param which should fetch value.
   * @param {number} ttl - Global TTL for values in milliseconds.
   */
  constructor(fetchFn, ttl = 0) {
    this.fn = fetchFn;
    this.ttl = ttl;
    this.storage = new Map();
    this.timeoutStorage = new Map();
  }

  setKeyId(keyId, value, ttl = 0) {
    this.storage.set(keyId, value);

    const valueTTL = ttl || this.ttl;

    const timeoutStorageId = this.timeoutStorage.get(keyId);

    if (timeoutStorageId !== undefined) {
      clearTimeout(timeoutStorageId);
      this.timeoutStorage.delete(keyId);
    }

    if (valueTTL !== 0) {
      this.timeoutStorage.set(
        keyId,
        setTimeout(() => this.storage.delete(keyId), valueTTL),
      );
    }
  }

  set(key, value, ttl = 0) {
    return this.setKeyId(hash(key), value, ttl);
  }

  async get(key = null, ttl = 0, onMiss = null) {
    const keyId = hash(key);

    if (!this.hasKeyId(keyId)) {
      (onMiss || (() => {}))(keyId);
      const value = await this.fn(key);
      this.setKeyId(keyId, value, ttl);
    }

    return this.storage.get(keyId);
  }

  hasKeyId(keyId) {
    return this.storage.has(keyId);
  }

  has(key) {
    return this.storage.has(hash(key));
  }
}

module.exports = SimpleCache;
