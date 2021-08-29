const Koa = require('koa');
const koaBody = require('koa-body');
const compress = require('koa-compress');
const TreeRouter = require('koa-tree-router');
const koaLogger = require('koa-logger');
const zlib = require('zlib');
const logger = require('./utils/logger');
const LambdaRunner = require('./lambda');
const startRollupWatch = require('./utils/watcher');
const errorWrapper = require('./utils/error');
const { collectMockData } = require('./utils/mock');

class DevServer {
  constructor(config, rollupConfigPath) {
    this.config = config;
    this.logger = logger;
    this.rollupConfigPath = rollupConfigPath;
    this.server = new Koa();
    this.router = new TreeRouter();
  }
  async start() {
    // init
    this.server.use(
      koaBody({
        multipart: true,
        formidable: {
          maxFileSize: this.config?.devServer?.maxFileSize || 100 * 1024 * 1024,
        },
      })
    );
    this.server.use(
      compress({
        filter(type) {
          return /^text/i.test(type) || type === 'application/json';
        },
        threshold: 2048,
        flush: zlib.constants.Z_SYNC_FLUSH,
        br: (type) => {
          // we can be as selective as we can:
          if (/^image\//i.test(type)) return null;
          if (/^text\//i.test(type) || type === 'application/json') {
            return {
              [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
              [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
            };
          }
          return { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 };
        },
      })
    );
    this.server.use(
      koaLogger((str, args) => {
        this.logger.debug(str);
      })
    );
    errorWrapper(this.server);
    // add dev config to context
    this.server.context.lambda = this.config?.lambda || {};
    this.server.context.rollup = this.config?.rollup || {};
    // add logger to server and context
    this.server.logger = this.logger;
    this.server.context.logger = this.logger;
    // operate rollup
    const watcher = await startRollupWatch(this.rollupConfigPath);
    this.watcher = watcher;
    // register controller
    const lambdaRunner = new LambdaRunner(this);
    const methods = ['get', 'post', 'head', 'put', 'delete', 'patch'];
    methods.forEach((method) => {
      this.router[method]('/*path', lambdaRunner.middleware);
    });
    this.server.use(this.router.routes());
    this.logger.info('Dev server initialized.');
    // collect mock data
    this.mock = await collectMockData();
    this.server.mock = this.mock;
    this.server.context.mock = this.mock;
    // start listening
    const port = this.config?.devServer?.port || 9292;
    this.server.listen(port);
    this.logger.info(`Dev server listening on ${port}.`);
  }
}

module.exports = DevServer;
