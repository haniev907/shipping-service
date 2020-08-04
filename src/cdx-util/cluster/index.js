const ClusterTaskHandler = require('./taskHandler');
const ClusterTaskHandlerAPIKey = require('./taskHandlerAPIKey');

const WorkerManager = require('./workerManager');

module.exports = {
  /** @class {ClusterTaskHandler} */
  ClusterTaskHandler,
  /** @class {ClusterTaskHandlerAPIKey} */
  ClusterTaskHandlerAPIKey,
  /** @class {WorkerManager} */
  WorkerManager,
};
