const path = require('path');
const levelup = require('levelup');
const leveldown = require('leveldown');

const KV_BASE = path.resolve(__dirname, '../../../kv');

let db;

class KV {
  constructor(config) {
    if (!config.enable) {
      throw new Error('Lambda KV Storage is not enabled in the configuration.');
    }
    // if db is not opened, open it
    if (!db) {
      db = levelup(leveldown(KV_BASE));
    }
  }
  async get(key) {
    try {
      return JSON.parse(
        await db.get(key, {
          asBuffer: false,
        })
      );
    } catch (err) {
      if (err.notFound) {
        return null;
      }
      throw err;
    }
  }
  async set(key, value) {
    await db.put(key, JSON.stringify(value));
  }
  async remove(key) {
    await db.del(key);
  }
}

module.exports = KV;
