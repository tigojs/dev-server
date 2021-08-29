const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const mime = require('mime');
const { v4: uuidv4 } = require('uuid');
const wrapper = require('../utils/classWrapper');
const { FILE_ABSOLUTE_PATH, OSS_MOCK_BASE } = require('../utils/mock');

const mockData = Symbol('mockData');

class OSS {
  constructor(config, mockData) {
    if (!config.enable) {
      throw new Error('CFS is not enabled in the configuration.');
    }
    this[mockData] = mockData;
  }
  async getObject(bucket, key) {
    if (!this[mockData][bucket]) {
      const err = new Error('Cannot find the bucket.');
      err.notFound = true;
      throw err;
    }
    const file = this[mockData][bucket][key];
    if (!file) {
      const err = new Error('Cannot find the key in the bucket.');
      err.notFound = true;
      throw err;
    }
    return {
      ...file,
      dataStream: fs.createStream(file[FILE_ABSOLUTE_PATH]),
    };
  }
  async putObject(bucket, key, file, force = false) {
    if (!this[mockData][bucket]) {
      const err = new Error('Cannot find the bucket.');
      err.notFound = true;
      throw err;
    }
    if (!Buffer.isBuffer(file)) {
      throw new Error('File should be a buffer.');
    }
    const formattedKey = key.startsWith('/') ? key.substr(1) : key;
    const targetPath = path.resolve(OSS_MOCK_BASE, `./${bucket}/${key}`);
    if (fs.existsSync(targetPath)) {
      if (!force) {
        throw new Error('The object already existed.');
      }
    }
    let keyDir;
    if (formattedKey.includes('/')) {
      const idx = formattedKey.lastIndexOf();
      keyDir = formattedKey.substring(0, idx - 1);
    } else {
      keyDir = '';
    }
    const targetDirPath = path.resolve(OSS_MOCK_BASE, `./${keyDir}`);
    if (!fs.existsSync(targetDirPath)) {
      await fsp.mkdir(targetDirPath, { recursive: true });
    }
    await fsp.writeFile(file, targetPath);
    // generate meta
    const dotIdx = key.lastIndexOf('.');
    let type;
    if (dotIdx >= 0) {
      type = mime.getType(key.substr(dotIdx + 1));
    }
    const meta = {
      type: type || 'unknown',
      lastModified: new Date().valueOf(),
      size: file.byteLength,
      fileId: uuidv4(),
      [FILE_ABSOLUTE_PATH]: targetPath,
    };
    this[mockData][bucket][key] = meta;
  }
}

module.exports = wrapper(OSS);
