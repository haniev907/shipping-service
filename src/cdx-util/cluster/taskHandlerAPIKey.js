const ClusterTaskHandler = require('./taskHandler');


class ClusterTaskHandlerAPIKey extends ClusterTaskHandler {
  constructor(limiter, cdx) {
    super(limiter);
    this.cdx = cdx;
  }

  async getJobs() {
    const validKeys = await this.cdx.db.apikey.getValidKeys();

    return validKeys.map(
      ({ keyId }) => ({
        jobId: String(keyId),
        args: { keyId: String(keyId) },
      }),
    );
  }

  async filter(job) {
    return this.cdx.db.apikey.valid(job.keyId);
  }
}

module.exports = ClusterTaskHandlerAPIKey;
