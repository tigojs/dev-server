#!/usr/bin/env node
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const DevServer = require('./src/server');
const logger = require('./src/utils/logger');
const pkgInfo = require('./package.json');

program.version(pkgInfo.version);

program.command('start')
  .option('-t, --tigo-dev-config <tigoDevConfig>')
  .option('-r, --rollup-config <rollupConfig>')
  .action(async (options) => {
    // check options
    if (!options.tigoDevConfig) {
      logger.error('Please specify the tigo dev config file path.');
      return process.exit(-1);
    }
    if (!options.rollupConfig) {
      logger.error('Please specify the rollup config file path.');
      return process.exit(-1);
    }
    // check path
    const { tigoDevConfig, rollupConfig } = options;
    const tigoDevConfigPath = path.resolve(process.cwd(), tigoDevConfig);
    if (!fs.existsSync(tigoDevConfigPath)) {
      logger.error('Cannot locate the tigo dev config file.');
      return process.exit(-1);
    }
    const rollupConfigPath = path.resolve(process.cwd(), rollupConfig);
    if (!fs.existsSync(rollupConfigPath)) {
      logger.error('Cannot locate the rollup config file.');
      return process.exit(-1);
    }
    // start up dev server
    const tigoConfig = JSON.parse(fs.readFileSync(tigoDevConfigPath, { encoding: 'utf8' }));
    const devServer = new DevServer(tigoConfig, rollupConfigPath);
    devServer.start();
  });

program.parse();
