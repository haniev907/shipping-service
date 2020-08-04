const repl = require('repl');

const cdxUtil = require('@cdx/util');
const config = require('@cdx/config');
const cdx = require('@cdx/core')(config);

const replServer = repl.start('cdx > ');

replServer.context.cdxUtil = cdxUtil;
replServer.context.config = config;
replServer.context.cdx = cdx;
