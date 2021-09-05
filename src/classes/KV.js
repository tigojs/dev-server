const path = require('path');
const fs = require('fs');
const levelup = require('levelup');
const leveldown = require('leveldown');
const wrapper = require('../utils/classWrapper');

const KV_BASE = path.resolve(process.cwd(), './tigo-dev/kv');

let db;

class KV {
  constructor(config) {
    if (!config.enable) {
      throw new Error('Lambda KV Storage is not enabled in the configuration.');
    }
    // if db is not opened, open it
    if (!fs.existsSync(KV_BASE)) {
      fs.mkdirSync(KV_BASE, { recursive: true });
    }
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
      console.error(err);
      if (err.notFound) {
        return null;
      }
      throw err;
    }
  }
  async set(key, value) {
    try {
      await db.put(key, JSON.stringify(value));
    } catch (err) {
      console.error(err);
    }
  }
  async remove(key) {
    try {
      await db.del(key);
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = wrapper(KV);
