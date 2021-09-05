const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const mime = require('mime');
const { v4: uuidv4 } = require('uuid');

const MOCK_BASE = path.resolve(process.cwd(), './tigo-dev/mock');
const CFS_MOCK_BASE = path.resolve(MOCK_BASE, './cfs');
const OSS_MOCK_BASE = path.resolve(MOCK_BASE, './oss');

const CFS_ALLOW_TYPE = ['.json', '.xml', '.yaml'];

const FILE_ABSOLUTE_PATH = Symbol('file_absolute_path');

async function collectCFSMock() {
  if (!fs.existsSync(CFS_MOCK_BASE)) {
    return;
  }
  const dir = await fsp.readdir(CFS_MOCK_BASE);
  const map = {};
  dir.forEach(async (filename) => {
    const filePath = path.resolve(CFS_MOCK_BASE, `./${filename}`);
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      return;
    }
    const ext = path.extname();
    if (!CFS_ALLOW_TYPE.includes(ext)) {
      return;
    }
    map[filename] = await fsp.readFile(filePath, { encoding: 'utf-8' });
    // add watch
    fs.watch(filePath, fs.watch(filePath, null, async () => {
      map[filename] = await fsp.readFile(filePath);
    }));
  });
  return map;
}

function generateMeta(fileName, fileStat) {
  let ext = path.extname(fileName);
  if (ext) {
    ext = ext.substr(1);
  }
  const meta = {
    size: fileStat.size,
    lastModified: fileStat.mtime,
    type: mime.getType(ext),
  };
  return meta;
}

// dirBase is a relative path to the oss mock data base
async function collectBucketFiles(bucket, dirBase) {
  const dirPath = path.resolve(OSS_MOCK_BASE, `./${dirBase}`);
  const dir = await fsp.readdir(dirPath);
  dir.forEach(async (name) => {
    const targetPath = path.resolve(dirPath, `./${name}`);
    const stat = await fsp.stat(targetPath);
    if (stat.isDirectory()) {
      await collectBucketFiles(bucket, `${dirBase}/${name}`);
    }
    // is file, generate meta data
    const handler = {
      ownKeys: function (target) {
        return Reflect.ownKeys(target);
      },
    };
    const meta = {
      ...generateMeta(name, stat),
      fileId: uuidv4(),
      [FILE_ABSOLUTE_PATH]: targetPath,
    };
    bucket[`${dirBase}/${name}`] = new Proxy(meta, handler);
  });
  return bucket;
}

async function collectOSSMock() {
  if (!fs.existsSync(OSS_MOCK_BASE)) {
    return;
  }
  const dir = await fsp.readdir(OSS_MOCK_BASE);
  const map = {};
  dir.forEach(async (name) => {
    const targetPath = path.resolve(OSS_MOCK_BASE, `./${name}`);
    const stat = await fsp.stat(targetPath);
    if (!stat.isDirectory()) {
      return;
    }
    // the first layer is bucket
    map[name] = collectBucketFiles(Object.create(null), name);
  });
  return map;
}

async function collectMockData() {
  if (!fs.existsSync(MOCK_BASE)) {
    return;
  }
  // collect cfs mock data
  const cfsMock = await collectCFSMock();
  const ossMock = await collectOSSMock();

  return {
    cfs: cfsMock,
    oss: ossMock,
  };
}

module.exports = {
  generateMeta,
  collectMockData,
  FILE_ABSOLUTE_PATH,
  OSS_MOCK_BASE,
};
