const path = require('path');
const fs = require('fs');
const moment = require('moment');

const LOG_DIR = path.resolve(__dirname, '../../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const buildLog = (type, contents) => {
  if (!contents.length) {
    // no content, regard as invalid log
    return null;
  }
  // build message
  const message = contents
    .map((content) => {
      if (typeof content === 'object') {
        if (content instanceof Error) {
          return `${content}`;
        } else {
          return JSON.stringify(content);
        }
      }
      return `${content}`;
    })
    .join(' ');
  return [`[${moment().format('YYYY-MM-DD HH:mm:ss')}]`, `${type}`, message].join(' ');
};

class Log {
  constructor() {
    this.logPath = path.resolve(LOG_DIR, `./log_${Date.now()}`);
  }
  writeLog(type, contents) {
    const log = buildLog(type, contents);
    fs.appendFile(this.logPath, log);
  }
  debug(...contents) {
    this.writeLog('debug', contents);
  }
  info(...contents) {
    this.writeLog('info', contents);
  }
  warn(...contents) {
    this.writeLog('warn', contents);
  }
  error(...contents) {
    this.writeLog('error', contents);
  }
  fatal(...contents) {
    this.writeLog('fatal', contents);
  }
}

module.exports = Log;
