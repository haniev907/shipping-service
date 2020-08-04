const Bull = require('bull');
const logger = require('./logging');
const { hash } = require('./common');

const REVIVAL_NEXT_MSG = 'REVIVAL_NEXT';

class Queue {
  constructor(config, name, queueOpts = null) {
    this.config = config;
    this.name = name;

    const defaultOpts = {
      redis: {
        host: this.config.queues.redisHost,
        port: this.config.queues.redisPort,
      },
    };

    this.bull = new Bull(this.name, Object.assign(defaultOpts, queueOpts || {}));
  }

  /**
   *
   * @param {function} processor
   * @param {object} [opts]
   * @param {number} [opts.concurrency]
   * @param {function} [opts.filterFn]
   */
  processJob(processor, opts = {}) {
    const filter = opts.filterFn || (async () => true);

    const bullProcessor = async (job) => {
      try {
        // Remove job
        if (!await filter(job)) {
          logger.error(
            'job-removed',
            { job },
            this.config.logging.queue.processor.filter,
          );
          return Promise.resolve();
        }

        return await processor(job);
      } catch (err) {
        const msg = err && (err.message || err);
        if (msg !== REVIVAL_NEXT_MSG) {
          logger.error(`Unhandled exception occurred during job processing: ${
            msg
          }`);
        }

        // It's helpful, uncomment this to see stack trace.
        // console.trace(err);

        throw Error(err);
      }
    };

    this.bull.process(
      opts.concurrency || this.config.queues.prefs.defaultConcurrency,
      bullProcessor,
    );
  }

  async empty() {
    return this.bull.empty();
  }

  async close() {
    return this.bull.close();
  }
}

class SimpleQueue extends Queue {
  constructor(config, name, queueOpts = {}) {
    super(config, name, queueOpts);

    this.jobDefaultOpts = {
      removeOnFail: 10,
      removeOnComplete: 10,
    };
  }

  async addSimpleJob(jobData) {
    return this.bull.add(jobData, this.jobDefaultOpts);
  }

  async addRepeatableJob(jobData, repeatOpts) {
    return this.bull.add(
      jobData,
      Object.assign({}, this.jobDefaultOpts, { repeat: repeatOpts }),
    );
  }

  async addCustomJob(jobData, jobOpts) {
    return this.bull.add(
      jobData,
      Object.assign({}, this.jobDefaultOpts, jobOpts),
    );
  }
}

class RevivableQueue extends Queue {
  constructor(config, name, queueOpts = null) {
    const defaultOpts = {
      settings: {
        lockDuration: config.queues.prefs.lockDuration,
        stalledInterval: config.queues.prefs.stalledInterval,
        maxStalledCount: Number.MAX_SAFE_INTEGER,
      },
    };

    super(config, name, Object.assign(
      defaultOpts, queueOpts || {},
    ));
  }

  static hash(jobData) {
    return hash(jobData);
  }

  async ensureRevivableJob(jobData, hashFn = null, backoffDelay = null) {
    return this.bull.add(jobData, {
      jobId: (hashFn || RevivableQueue.hash)(jobData),
      backoff: {
        type: 'fixed',
        delay: backoffDelay || this.config.queues.prefs.backoffDelay,
      },
      removeOnFail: true,
      removeOnComplete: true,
      attempts: Number.MAX_SAFE_INTEGER,
      stackTraceLimit: this.config.queues.prefs.stackTraceLimit,
    });
  }

  static async forever() {
    return new Promise(() => {});
  }

  static async revivalNext() {
    return Promise.reject(REVIVAL_NEXT_MSG);
  }

  static async removeJob() {
    return Promise.resolve();
  }
}

module.exports = {
  SimpleQueue,
  RevivableQueue,
};
