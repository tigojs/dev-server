const loadConfigFile = require('rollup/dist/loadConfigFile');
const rollup = require('rollup');

const startRollupWatch = async (rollupConfigPath) => {
  const { options, warnings } = await loadConfigFile(rollupConfigPath, { format: 'cjs' });
  warnings.flush();
  for (const optionsObj of options) {
    const bundle = await rollup.rollup(optionsObj);
    await Promise.all(optionsObj.output.map(bundle.write));
  }
  const watcher = rollup.watch(options);
  return watcher;
};

module.exports = startRollupWatch;
