const handler = {
  ownKeys: function (target) {
    return Reflect.ownKeys(target);
  },
};

const createNew = (clazz) => {
  return (config, mockData) => {
    const instance = new clazz(config, mockData);
    const proxy = new Proxy(instance, handler);
    return proxy;
  };
}

module.exports = createNew;
