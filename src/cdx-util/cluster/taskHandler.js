/** @class JobResultStatus */
const jobResultStatus = {
  done: 0,
  failure: 1,
  remove: 2,
};

const makeJobResult = (status, msg) => Promise.resolve({ status, msg });

/** @class JobResult */
const jobResult = {
  done: msg => makeJobResult(jobResultStatus.done, msg),
  failure: msg => makeJobResult(jobResultStatus.failure, msg),
  remove: msg => makeJobResult(jobResultStatus.remove, msg),
};


class ClusterTaskHandler {
  constructor(limiter) {
    this.limiter = limiter;
  }

  static get jobResultStatus() {
    return jobResultStatus;
  }

  /** @returns {JobResult} */
  static get jobResult() {
    return jobResult;
  }

  async getJobs() {
    throw new Error(`getJobs() not implemented, ${this}`);
  }

  async filter() { /* eslint-disable-line class-methods-use-this */
    return true;
  }

  async runJob() {
    throw new Error(`runJob() not implemented, ${this}`);
  }
}

module.exports = ClusterTaskHandler;
