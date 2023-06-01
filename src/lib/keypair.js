const { genKeys } = require('../lib/helpers');
const { green } = require('chalk');

/**
 * Generate a new key pair, write to file, and display the public key
 */
async function genKeyPair({ network, deployAliasName }) {
  const keyPair = await genKeys({ network, deployAliasName });
  console.log(green('Written to file:', `keys/${deployAliasName}.json`));
  console.log('Public key:', keyPair.publicKey);
}

module.exports = {
  genKeyPair,
};
