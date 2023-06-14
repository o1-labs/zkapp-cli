const fs = require('fs-extra');
const findPrefix = require('find-npm-prefix');
const os = require('os');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const { step } = require('./helpers');
const { green, red, bold, gray } = require('chalk');
const Client = require('mina-signer');
const { prompts } = require('./prompts');
const { PrivateKey, PublicKey } = require('snarkyjs');
const HOME_DIR = os.homedir();
const log = console.log;

/**
 * Show existing deploy aliases in `config.json` and allow a user to add a new
 * deploy alias and url--and generate a key pair for it.
 * @returns {Promise<void>}
 */
async function config() {
  // Get project root, so the CLI command can be run anywhere inside their proj.
  const DIR = await findPrefix(process.cwd());

  let config;
  try {
    config = fs.readJSONSync(`${DIR}/config.json`);
  } catch (err) {
    let str;
    if (err.code === 'ENOENT') {
      str = `config.json not found. Make sure you're in a zkApp project.`;
    } else {
      str = 'Unable to read config.json.';
      console.error(err);
    }
    log(red(str));
    return;
  }

  let isFeepayerCached = false;
  let defaultFeepayerAlias;
  let cachedFeepayerAliases;
  let defaultFeepayerAddress;

  try {
    cachedFeepayerAliases = getCachedFeepayerAliases(HOME_DIR);
    defaultFeepayerAlias = cachedFeepayerAliases[0];
    defaultFeepayerAddress = getCachedFeepayerAddress(
      HOME_DIR,
      defaultFeepayerAlias
    );

    isFeepayerCached = true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
    }
  }

  // Checks if developer has the legacy networks in config.json and renames it to deploy aliases.
  if (Object.prototype.hasOwnProperty.call(config, 'networks')) {
    Object.assign(config, { deployAliases: config.networks });
    delete config.networks;
  }

  // Build table of existing deploy aliases found in their config.json
  let tableData = [[bold('Name'), bold('URL'), bold('Smart Contract')]];
  for (const deployAliasName in config.deployAliases) {
    const { url, smartContract } = config.deployAliases[deployAliasName];
    tableData.push([
      deployAliasName,
      url ?? '',
      smartContract ?? gray('(never deployed)'),
    ]);
  }

  // Sort alphabetically by deploy alias name.
  tableData = tableData.sort((a, b) => a[0].localeCompare(b[0]));

  const tableConfig = {
    border: getBorderCharacters('norc'),
    header: {
      alignment: 'center',
      content: bold('Deploy aliases in config.json'),
    },
  };

  // Show "none found", if no deploy aliases exist.
  if (tableData.length === 1) {
    // Add some padding to empty name & url columns, to feel more natural.
    tableData[0][0] = tableData[0][0] + ' '.repeat(2);
    tableData[0][1] = tableData[0][1] + ' '.repeat(3);

    tableData.push([[gray('None found')], [], []]);
    tableConfig.spanningCells = [{ col: 0, row: 1, colSpan: 3 }];
  }

  // Print the table. Indented by 2 spaces for alignment in terminal.
  const msg = '\n  ' + table(tableData, tableConfig).replaceAll('\n', '\n  ');
  log(msg);

  console.log('Enter values to create a deploy alias:');

  const {
    deployAliasPrompts,
    initialFeepayerPrompts,
    recoverFeepayerPrompts,
    otherFeepayerPrompts,
    feepayerAliasPrompt,
  } = prompts;

  const initialPromptResponse = await prompt([
    ...deployAliasPrompts(config),
    ...initialFeepayerPrompts(
      defaultFeepayerAlias,
      defaultFeepayerAddress,
      isFeepayerCached
    ),
  ]);

  let recoverFeepayerResponse;
  let feepayerAliasResponse;
  let otherFeepayerResponse;

  if (initialPromptResponse.feepayer === 'recover') {
    recoverFeepayerResponse = await prompt(recoverFeepayerPrompts);
  }

  if (initialPromptResponse?.feepayer === 'create') {
    feepayerAliasResponse = await prompt(feepayerAliasPrompt);
  }

  if (initialPromptResponse.feepayer === 'other') {
    otherFeepayerResponse = await prompt(
      otherFeepayerPrompts(cachedFeepayerAliases)
    );

    if (otherFeepayerResponse.feepayer === 'recover') {
      recoverFeepayerResponse = await prompt(recoverFeepayerPrompts);
    }

    if (otherFeepayerResponse.feepayer === 'create') {
      feepayerAliasResponse = await prompt(feepayerAliasPrompt);
    }
  }

  const promptResponse = {
    ...initialPromptResponse,
    ...recoverFeepayerResponse,
    ...otherFeepayerResponse,
    ...feepayerAliasResponse,
  };

  // If user presses "ctrl + c" during interactive prompt, exit.
  let {
    deployAliasName,
    url,
    fee,
    feepayer,
    feepayerAliasName,
    feepayerKey,
    alternateCachedFeepayerAlias,
  } = promptResponse;

  if (!deployAliasName || !url || !fee) return;

  let feepayerKeyPair;
  switch (feepayer) {
    case 'create':
      feepayerKeyPair = await createKeyPairStep(HOME_DIR, feepayerAliasName);
      break;
    case 'recover':
      feepayerKeyPair = await recoverKeyPairStep(
        HOME_DIR,
        feepayerKey,
        feepayerAliasName
      );
      break;
    case 'defaultCache':
      feepayerAliasName = defaultFeepayerAlias;
      feepayerKeyPair = await savedKeyPairStep(
        HOME_DIR,
        defaultFeepayerAlias,
        defaultFeepayerAddress
      );
      break;
    case 'alternateCachedFeepayer':
      feepayerAliasName = alternateCachedFeepayerAlias;
      feepayerKeyPair = await savedKeyPairStep(
        HOME_DIR,
        alternateCachedFeepayerAlias
      );
      break;
    default:
      break;
  }

  await step(
    `Create zkApp key pair at keys/${deployAliasName}.json`,
    async () => {
      const keyPair = createKeyPair('testnet');
      fs.outputJsonSync(`${DIR}/keys/${deployAliasName}.json`, keyPair, {
        spaces: 2,
      });
      return keyPair;
    }
  );

  await step(`Add deploy alias to config.json`, async () => {
    config.deployAliases[deployAliasName] = {
      url,
      keyPath: `keys/${deployAliasName}.json`,
      feepayerKeyPath: `${HOME_DIR}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
      feepayerAliasName,
      fee,
    };
    fs.outputJsonSync(`${DIR}/config.json`, config, { spaces: 2 });
  });

  const explorerName = getExplorerName(
    config.deployAliases[deployAliasName]?.url
  );

  const str =
    `\nSuccess!\n` +
    `\nNext steps:` +
    `\n  - If this is a testnet, request tMINA at:\n    https://faucet.minaprotocol.com/?address=${encodeURIComponent(
      feepayerKeyPair.publicKey
    )}&?explorer=${explorerName}` +
    `\n  - To deploy, run: \`zk deploy ${deployAliasName}\``;

  log(green(str));
}

// Creates a new feepayer key pair
async function createKeyPairStep(directory, feepayerAliasName) {
  return await step(
    `Create fee payer key pair at ${HOME_DIR}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
    async () => {
      const keyPair = createKeyPair('testnet');

      fs.outputJsonSync(
        `${directory}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
        keyPair,
        {
          spaces: 2,
        }
      );
      return keyPair;
    }
  );
}

async function recoverKeyPairStep(directory, feepayerKey, feepayerAliasName) {
  return await step(
    `Recover fee payer keypair from ${feepayerKey} and add to ${HOME_DIR}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
    async () => {
      const feepayorPrivateKey = PrivateKey.fromBase58(feepayerKey);
      const feepayerAddress = feepayorPrivateKey.toPublicKey();

      const keyPair = {
        privateKey: feepayerKey,
        publicKey: PublicKey.toBase58(feepayerAddress),
      };

      fs.outputJsonSync(
        `${directory}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
        keyPair,
        {
          spaces: 2,
        }
      );
      return keyPair;
    }
  );
}
// Returns a cached keypair from a given feepayer alias
async function savedKeyPairStep(directory, alias, address) {
  const keyPair = fs.readJSONSync(
    `${directory}/.cache/zkapp-cli/keys/${alias}.json`
  );

  if (!address) address = keyPair.publicKey;

  return await step(
    `Use stored fee payer ${alias} (public key: ${address}) `,

    async () => {
      return keyPair;
    }
  );
}

// Check if feepayer alias/aliases are stored on users machine and returns an array of them.
function getCachedFeepayerAliases(directory) {
  let aliases = fs.readdirSync(`${directory}/.cache/zkapp-cli/keys/`);

  aliases = aliases
    .filter((fileName) => fileName.includes('json'))
    .map((name) => name.slice(0, -5));

  return aliases;
}

function getCachedFeepayerAddress(directory, feePayorAlias) {
  const address = fs.readJSONSync(
    `${directory}/.cache/zkapp-cli/keys/${feePayorAlias}.json`
  ).publicKey;

  return address;
}

function createKeyPair(network) {
  const client = new Client({ network });
  return client.genKeys();
}

function getExplorerName(graphQLUrl) {
  return new URL(graphQLUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
}

module.exports = {
  config,
};
