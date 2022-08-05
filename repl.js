const repl = require('repl');

const cdxUtil = require('./src/cdx-util');
const config = require('.//config');
const cdx = require('./src/cdx')(config);

const replServer = repl.start('cdx > ');

replServer.context.cdxUtil = cdxUtil;
replServer.context.config = config;
replServer.context.cdx = cdx;
