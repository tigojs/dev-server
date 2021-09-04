const { NodeVM } = require('vm2');
const LRUCache = require('lru-cache');
const fs = require('fs');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const Response = require('./classes/Response');
const { createContextProxy } = require('./utils/context');
const allowList = require('./constants/allowList');
const CFS = require('./classes/CFS');
const Log = require('./classes/Log');

const CACHE_KEY = 'tigo_lambda_dev';

const cache = new LRUCache({
  max: 10,
});

class LambdaRunner {
  constructor(app) {
    app.watcher.on('event', async ({ result }) => {
      if (result) {
        await result.close();
        // remove cache after script changed
        if (result.closed && cache.has(CACHE_KEY)) {
          cache.del(CACHE_KEY);
          app.logger.info('Function cache refreshed.');
        }
        app.logger.info('Bundled script has been already rebuilt.');
      }
    });
    // set this
    this.app = app;
    this.cfsEnabled = app.config.lambda?.cfs?.enable;
    this.ossEnabled = app.config.lambda?.oss?.enable;
    this.kvEnabled = app.config.lambda?.kv?.enable;
  }
  async middleware(ctx, next) {
    const bundled = ctx.rollup.output || './dist/bundled.js';
    let eventEmitter;
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      eventEmitter = cached.eventEmitter;
    } else {
      if (!bundled || !fs.existsSync(bundled)) {
        throw new Error('Cannot find the bundled script file.');
      }
      const eventEmitter = new EventEmitter();
      const addEventListener = (name, func) => {
        eventEmitter.on(name, func);
      };
      const allowedRequire = ctx.lambda.allowedRequire || [];
      const script = fs.readFileSync(bundled, { encoding: 'utf-8' });
      const vm = new NodeVM({
        eval: false,
        wasm: false,
        sandbox: {
          addEventListener,
        },
        require: {
          external: {
            modules: [...allowList, ...(allowedRequire || [])],
          },
          builtin: ctx.lambda.allowBuiltin ? ctx.lambda.allowedBuiltin || [] : [],
        },
      });
      vm.freeze('env', ctx.lambda.env || {});
      vm.freeze(Response, 'Response');
      vm.freeze(fetch, 'fetch');
      if (this.cfsEnabled) {
        vm.freeze(CFS(ctx.lambda.cfs || {}, app.mock.cfs), 'CFS');
      }
      if (this.ossEnabled) {
        vm.freeze(OSS(ctx.lambda.oss || {}, app.mock.oss), 'OSS');
      }
      if (this.kvEnabled) {
        vm.freeze(KV(ctx.lambda.kv || {}), 'KV');
      }
      if (this.logEnabled) {
        vm.freeze(new Log(), 'Log');
      }
      vm.run(script);
      cache.set(CACHE_KEY, { vm, eventEmitter });
    }
    await new Promise((resolve, reject) => {
      const wait = setTimeout(() => {
        reject('The function execution time is above the limit.');
      }, (ctx.lambda.maxWaitTime || 10) * 1000);
      eventEmitter.emit('request', {
        context: createContextProxy(ctx),
        respondWith: (response) => {
          ctx.status = response?.status ? response.status : ctx.status || 200;
          if (response?.headers) {
            Object.keys(response.headers).forEach((key) => {
              ctx.set(key, response.headers.key);
            });
          }
          ctx.body = response?.body ? response.body : ctx.body || '';
          // set content type when body is a object
          if (!ctx.headers['content-type'] && response) {
            if (typeof response.body === 'object') {
              ctx.set('Content-Type', 'application/json');
            } else if (response.body) {
              ctx.set('Content-Type', 'text/plain');
            }
          }
          if (response?.redirect) {
            ctx.redirect(response.redirect);
          }
          clearTimeout(wait);
          eventEmitter.off('error', errorHandler);
          resolve();
          // only the succeed request will be logged
          performenceLog && performenceLog.end();
          statusLog && statusLog.success();
        },
      });
    });
    await next();
  }
}

module.exports = LambdaRunner;
