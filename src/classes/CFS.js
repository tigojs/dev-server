const mockData = Symbol('mockData');
const wrapper = require('../utils/classWrapper');

class CFS {
  constructor(config, mockData) {
    if (!config.enable) {
      throw new Error('CFS is not enabled in the configuration.');
    }
    this[mockData] = mockData;
  }
  get(name, type = null) {
    if (!type) {
      return this[mockData][name] || null;
    }
    return this[mockData][`${name}.${type}`] || null;
  }
}

module.exports = wrapper(CFS);
