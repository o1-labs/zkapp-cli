const ora = require('ora');
const fs = require('fs-extra');
const Client = require('mina-signer');
const { green, red } = require('chalk');
const findPrefix = require('find-npm-prefix');

/**
 * Helper for any steps for a consistent UX.
 * @template T
 * @param {string} step  Name of step to show user.
 * @param {() => Promise<T>} fn  An async function to execute.
 * @returns {Promise<T>}
 */
async function step(str, fn) {
  // discardStdin prevents Ora from accepting input that would be passed to a
  // subsequent command, like a y/n confirmation step, which would be dangerous.
  const spin = ora({ text: `${str}...`, discardStdin: true }).start();
  try {
    const result = await fn();
    spin.succeed(green(str));
    return result;
  } catch (err) {
    spin.fail(str);
    console.error('  ' + red(err)); // maintain expected indentation
    console.log(err);
    process.exit(1);
  }
}

/**
 * Read and return the config file
 */
async function configRead(path) {
  const configPath = path ? path : await projRoot();
  let config;
  try {
    config = fs.readJSONSync(`${configPath}/config.json`);
  } catch (err) {
    let str;
    if (err.code === 'ENOENT') {
      str = `config.json not found. Make sure you're in a zkApp project.`;
    } else {
      str = 'Unable to read config.json.';
      console.error(err);
    }
    console.log(red(str));
    return;
  }
  return config;
}

/**
 * Root of the zkapp project
 * @returns {Promise<string>}
 */
async function projRoot() {
  const DIR = await findPrefix(process.cwd());
  return DIR;
}

/**
 * Key names
 * @param {string} path Path to keys directory. Default to ./keys
 * @returns {Promise<Array<string>>}
 */
async function keyNames(path) {
  const keysDir = path ? path : `${await projRoot()}/keys`;
  const keys = fs
    .readdirSync(keysDir)
    .map((fname) => fname.substring(0, fname.lastIndexOf('.')));
  return keys;
}

/**
 * Generate a keypair for the given network and write to the specified path/deployAliasName
 * @param {string} network Default: 'testnet'
 * @param {string} path Default: ./keys
 * @param {string} deployAliasName Required
 * @returns {Promise<Keypair>}
 */
async function genKeys({ network, path, deployAliasName }) {
  const keyDir = path ? path : `${await projRoot()}/keys`;

  // make sure we don't overwrite a key
  const keys = await keyNames();
  if (keys.includes(deployAliasName)) {
    console.error(red(`keys/${deployAliasName}.json already exists!`));
    console.error(
      red(`It must be deleted to create a new keypair under this name.`)
    );
    process.exit(1);
  }

  const net = network ? network : 'testnet';
  const client = new Client({ network: net });
  let keyPair = client.genKeys();
  fs.outputJsonSync(`${keyDir}/${deployAliasName}.json`, keyPair, {
    spaces: 2,
  });
  return keyPair;
}

module.exports = {
  step,
  genKeys,
  keyNames,
  projRoot,
  configRead,
};
