const winston = require('winston');


const dataToLog = (message, meta, logClass, log) => log(
  `${logClass}::${message}`,
  meta,
);


class ExtendedLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOGGER_LEVEL || 'info',
      format: winston.format.json(),
    });

    // Specify default meta values
    this.defaultMeta = {
      // env: process.env.NODE_ENV || 'development',
    };

    const transport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.printf((info) => {
          const timestamp = `${info.timestamp} `;
          const level = `${info.level} `;
          const logClass = `${info.message}`;

          const metaObject = { ...info.meta, ...this.defaultMeta } || { ...this.defaultMeta };
          // metaObject.env = process.env.NODE_ENV || 'development';

          const meta = JSON.stringify(metaObject);

          return `${timestamp}${level}[${logClass}]:${meta}`;
        }),
      ),
    });

    this.logger.add(transport);

    // Bind logging methods
    this.info = (message, meta, logClass = '') => dataToLog(
      message, meta, logClass, this.logger.info,
    );

    this.error = (message, meta, logClass = '') => dataToLog(
      message, meta, logClass, this.logger.error,
    );

    this.warn = (message, meta, logClass = '') => dataToLog(
      message, meta, logClass, this.logger.warn,
    );

    this.verbose = (message, meta, logClass = '') => dataToLog(
      message, meta, logClass, this.logger.verbose,
    );

    this.debug = (message, meta, logClass = '') => dataToLog(
      message, meta, logClass, this.logger.debug,
    );
  }

  setDefaultMeta(meta) {
    this.defaultMeta = meta;
  }
}

module.exports = ExtendedLogger;
