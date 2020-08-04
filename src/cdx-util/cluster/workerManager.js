const jobStatusName = [
  'notFound', 'running', 'done', 'failure',
  'assigned', 'remove', 'exception', 'tooManyRequests',
];
/** @class JobStatus */
const jobStatus = jobStatusName.reduce(
  (res, key, idx) => Object.assign(
    res, { [key]: idx },
  ), {},
);

/** @class {WorkerManager} */
class WorkerManager {
  constructor(
    config, cdxUtil,
    reqLimitMinute = 1000, ordersLimitDay = 190000, ordersLimitSecond = 10,
  ) {
    this.config = config;
    this.logger = new cdxUtil.Logging();

    /** @type {Map<String,Map<String, Promise>>} */
    this.jobs = new Map();
    /** @type {Map<String, ClusterTaskHandler>} */
    this.handlers = new Map();

    this.watcherIntervalMS = 5 * 60 * 1000;

    this.jobResultToJobStatus = {
      [cdxUtil.cluster.ClusterTaskHandler.jobResultStatus.done]: jobStatus.done,
      [cdxUtil.cluster.ClusterTaskHandler.jobResultStatus.remove]: jobStatus.remove,
      [cdxUtil.cluster.ClusterTaskHandler.jobResultStatus.failure]: jobStatus.failure,
    };

    const reqMeter = new cdxUtil.ds.Meter();
    const reqLimiter = new cdxUtil.ds.Limiter(reqLimitMinute, reqMeter);

    const ordersMeterDay = new cdxUtil.ds.Meter(
      config.constants.mSecOneDay, config.constants.mSecOneHour,
    );
    const ordersLimiterDay = new cdxUtil.ds.Limiter(
      ordersLimitDay, ordersMeterDay,
    );

    const ordersMeterHour = new cdxUtil.ds.Meter(
      config.constants.mSecOneHour, config.constants.mSecOneMinute,
    );
    const ordersLimiterHour = new cdxUtil.ds.AggLimiter(
      ordersLimiterDay, ordersMeterHour,
    );

    const ordersMeterMinute = new cdxUtil.ds.Meter(
      config.constants.mSecOneMinute, config.constants.mSecOneSecond,
    );
    const ordersLimiter = new cdxUtil.ds.AggLimiter(
      ordersLimiterHour, ordersMeterMinute, ordersLimitSecond,
    );

    this.limiter = {
      /** @type {Limiter} */
      requests: reqLimiter,
      /** @type {Limiter} */
      orders: ordersLimiter,
    };
  }

  setJob(taskName, jobId, job) {
    if (!this.jobs.has(taskName)) {
      this.jobs.set(taskName, new Map());
    }
    this.jobs.get(taskName).set(jobId, job);
  }

  registerTaskHandler(taskName, TaskHandler, ...extraArgs) {
    this.handlers.set(
      taskName,
      new TaskHandler(this.limiter, ...extraArgs),
    );
  }

  static get jobStatusName() {
    return jobStatusName;
  }

  /** @returns {JobStatus} */
  static get jobStatus() {
    return jobStatus;
  }

  async checkJob(taskName, jobId) {
    if (!this.jobs.has(taskName) || !this.jobs.get(taskName).has(jobId)) {
      return { status: WorkerManager.jobStatus.notFound };
    }

    const job = this.jobs.get(taskName).get(jobId);
    const result = await Promise.race([
      job, Promise.resolve({ status: WorkerManager.jobStatus.running }),
    ]);

    return Object.assign({}, result);
  }

  /**
   * @param taskName {String}
   * @return {*|ClusterTaskHandler}
   */
  getHandler(taskName) {
    return this.handlers.get(taskName);
  }

  wrapJob(taskName, job, maxWeight, maxOrders) {
    return async () => {
      this.limiter.requests.reserve(maxWeight);
      this.limiter.orders.reserve(maxOrders);

      try {
        const handler = this.getHandler(taskName);

        const origResult = (
          await (handler.filter(job))
            ? await (handler.runJob(job))
            : {
              status: WorkerManager.jobStatus.remove,
              msg: 'pre-filtered',
            }
        );

        const result = {
          status: (
            this.jobResultToJobStatus[origResult.status]
            || WorkerManager.jobStatus.exception
          ),
          msg: origResult.msg,
        };

        if (result.status === WorkerManager.jobStatus.exception) {
          result.msg = `Invalid result. status: ${origResult.status}, msg: ${origResult.msg}`;
        }

        this.limiter.requests.free(maxWeight);
        this.limiter.orders.free(maxOrders);

        return result;
      } catch (e) {
        this.limiter.requests.free(maxWeight);
        this.limiter.orders.free(maxOrders);

        this.logger.error(
          'job-exception',
          { msg: e.message, stack: e.stack },
          this.config.logging.worker.basic,
        );

        return {
          status: WorkerManager.jobStatus.exception,
          msg: e.message,
        };
      }
    };
  }

  async setWatcher(taskName, jobId, remove = false) {
    if (remove) {
      if (this.jobs.has(taskName)) {
        this.jobs.get(taskName).delete(jobId);
      }
      return;
    }

    const jobResult = await this.checkJob(taskName, jobId);

    if (jobResult.status === WorkerManager.jobStatus.notFound) {
      return;
    }

    const setRemove = (jobResult.status !== WorkerManager.jobStatus.running);

    setTimeout(
      this.setWatcher.bind(this),
      this.watcherIntervalMS, taskName, jobId, setRemove,
    );
  }

  async getJobs(taskName) {
    return this.handlers.get(taskName).getJobs();
  }

  async runJob(taskName, job, maxWeight, maxOrders) {
    const jobResult = await this.checkJob(taskName, job.jobId);
    if (jobResult.status === WorkerManager.jobStatus.running) {
      // TODO: Log
      return jobResult;
    }

    if (maxWeight > this.limiter.requests.available) {
      this.logger.error('too-many-requests', {
        maxWeight,
        available: this.limiter.requests.available,
      }, this.config.logging.worker.basic);

      return { status: WorkerManager.jobStatus.tooManyRequests };
    }

    if (maxOrders > this.limiter.orders.available) {
      this.logger.error('too-many-orders', {
        maxOrders,
        available: this.limiter.orders.available,
      }, this.config.logging.worker.basic);

      return { status: WorkerManager.jobStatus.tooManyRequests };
    }

    const wrappedRunner = this.wrapJob(taskName, job, maxWeight, maxOrders);

    this.setJob(taskName, job.jobId, wrappedRunner());
    setTimeout(
      this.setWatcher.bind(this),
      this.watcherIntervalMS, taskName, job.jobId,
    );

    return { status: WorkerManager.jobStatus.assigned };
  }

  getStat() {
    const extractLimiterState = limiter => ({
      limit: limiter.limit,
      available: limiter.available,
      remain: limiter.remain,
      slotLimit: limiter.slotLimit,
      value: limiter.meter.value,
      interval: limiter.meter.interval,
      precision: limiter.meter.precision,
      offsetTS: limiter.meter.offsetTS,
      slots: limiter.meter.slots,
      sum: limiter.meter.sum,
    });

    return {
      reqWeight: extractLimiterState(this.limiter.requests),
      ordersCount: extractLimiterState(this.limiter.orders),
    };
  }
}

module.exports = WorkerManager;
