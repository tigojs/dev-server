const logger = require('./logger');

const errorWrapper = (server) => {
  server.context.onerror = function (err) {
    if (!err) {
      return;
    }
    this.set('Content-Type', 'application/json');
    this.body = JSON.stringify({
      success: false,
      message: err.message || 'Unknown error.',
      stack: err.stack,
    }, null, '  ');
    // end stream
    logger.error(err);
    this.res.end(this.body);
  };
};

module.exports = errorWrapper;
