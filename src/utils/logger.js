const log4js = require('log4js');

log4js.configure({
  appenders: {
    stdout: {
      type: 'stdout',
    },
  },
  categories: {
    default: {
      appenders: ['stdout'],
      level: 'debug',
    },
  },
});

module.exports = log4js.getLogger();
