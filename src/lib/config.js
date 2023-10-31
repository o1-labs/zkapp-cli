import chalk from 'chalk';
import enquirer from 'enquirer';
import findPrefix from 'find-npm-prefix';
import fs from 'fs-extra';
import Client from 'mina-signer';
import { PrivateKey, PublicKey } from 'o1js';
import { getBorderCharacters, table } from 'table';
import Constants from './constants.js';
import step from './helpers.js';
import prompts from './prompts.js';

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
    config = fs.readJsonSync(`${DIR}/config.json`);
  } catch (err) {
    let str;
    if (err.code === 'ENOENT') {
      str = `config.json not found. Make sure you're in a zkApp project directory.`;
    } else {
      str = 'Unable to read config.json.';
      console.error(err);
    }
    log(chalk.red(str));
    return;
  }

  let isFeepayerCached = false;
  let defaultFeepayerAlias;
  let cachedFeepayerAliases;
  let defaultFeepayerAddress;

  try {
    cachedFeepayerAliases = getCachedFeepayerAliases();
    defaultFeepayerAlias = cachedFeepayerAliases[0];
    defaultFeepayerAddress = getCachedFeepayerAddress(defaultFeepayerAlias);

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
  let tableData = [
    [chalk.bold('Name'), chalk.bold('URL'), chalk.bold('Smart Contract')],
  ];
  for (const deployAliasName in config.deployAliases) {
    const { url, smartContract } = config.deployAliases[deployAliasName];
    tableData.push([
      deployAliasName,
      url ?? '',
      smartContract ?? chalk.gray('(never deployed)'),
    ]);
  }

  // Sort alphabetically by deploy alias name.
  tableData = tableData.sort((a, b) => a[0].localeCompare(b[0]));

  const tableConfig = {
    border: getBorderCharacters('norc'),
    header: {
      alignment: 'center',
      content: chalk.bold('Deploy aliases in config.json'),
    },
  };

  // Show "none found", if no deploy aliases exist.
  if (tableData.length === 1) {
    // Add some padding to empty name & url columns, to feel more natural.
    tableData[0][0] = tableData[0][0] + ' '.repeat(2);
    tableData[0][1] = tableData[0][1] + ' '.repeat(3);

    tableData.push([[chalk.gray('None found')], [], []]);
    tableConfig.spanningCells = [{ col: 0, row: 1, colSpan: 3 }];
  }

  // Print the table. Indented by 2 spaces for alignment in terminal.
  const msg = '\n  ' + table(tableData, tableConfig).replaceAll('\n', '\n  ');
  log(msg);

  log('Enter values to create a deploy alias:');

  const {
    deployAliasPrompts,
    initialFeepayerPrompts,
    recoverFeepayerPrompts,
    otherFeepayerPrompts,
    feepayerAliasPrompt,
  } = prompts;

  const initialPromptResponse = await enquirer.prompt([
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
    recoverFeepayerResponse = await enquirer.prompt(
      recoverFeepayerPrompts(cachedFeepayerAliases)
    );
  }

  if (initialPromptResponse?.feepayer === 'create') {
    feepayerAliasResponse = await enquirer.prompt(
      feepayerAliasPrompt(cachedFeepayerAliases)
    );
  }

  if (initialPromptResponse.feepayer === 'other') {
    otherFeepayerResponse = await enquirer.prompt(
      otherFeepayerPrompts(cachedFeepayerAliases)
    );

    if (otherFeepayerResponse.feepayer === 'recover') {
      recoverFeepayerResponse = await enquirer.prompt(
        recoverFeepayerPrompts(cachedFeepayerAliases)
      );
    }

    if (otherFeepayerResponse.feepayer === 'create') {
      feepayerAliasResponse = await enquirer.prompt(
        feepayerAliasPrompt(cachedFeepayerAliases)
      );
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
    feepayerAlias,
    feepayerKey,
    alternateCachedFeepayerAlias,
  } = promptResponse;

  if (!deployAliasName || !url || !fee) return;

  let feepayerKeyPair;
  switch (feepayer) {
    case 'create':
      feepayerKeyPair = await createKeyPairStep(feepayerAlias);
      break;
    case 'recover':
      feepayerKeyPair = await recoverKeyPairStep(feepayerKey, feepayerAlias);
      break;
    case 'defaultCache':
      feepayerAlias = defaultFeepayerAlias;
      feepayerKeyPair = await savedKeyPairStep(
        defaultFeepayerAlias,
        defaultFeepayerAddress
      );
      break;
    case 'alternateCachedFeepayer':
      feepayerAlias = alternateCachedFeepayerAlias;
      feepayerKeyPair = await savedKeyPairStep(alternateCachedFeepayerAlias);
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
    if (!feepayerAlias) {
      // No fee payer alias, return early to prevent creating a deploy alias with invalid fee payer
      log(chalk.red(`Invalid fee payer alias ${feepayerAlias}" .`));
      process.exit(1);
    }
    config.deployAliases[deployAliasName] = {
      url,
      keyPath: `keys/${deployAliasName}.json`,
      feepayerKeyPath: `${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
      feepayerAlias,
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

  log(chalk.green(str));
}

// Creates a new feepayer key pair
async function createKeyPairStep(feepayerAlias) {
  if (!feepayerAlias) {
    // No fee payer alias, return early to prevent generating key pair with undefined alias
    log(chalk.red(`Invalid fee payer alias ${feepayerAlias}.`));
    return;
  }
  return await step(
    `Create fee payer key pair at ${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
    async () => {
      const keyPair = createKeyPair('testnet');

      fs.outputJsonSync(
        `${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
        keyPair,
        {
          spaces: 2,
        }
      );
      return keyPair;
    }
  );
}

async function recoverKeyPairStep(feepayerKey, feepayerAlias) {
  return await step(
    `Recover fee payer keypair from ${feepayerKey} and add to ${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
    async () => {
      const feepayorPrivateKey = PrivateKey.fromBase58(feepayerKey);
      const feepayerAddress = feepayorPrivateKey.toPublicKey();

      const keyPair = {
        privateKey: feepayerKey,
        publicKey: PublicKey.toBase58(feepayerAddress),
      };

      fs.outputJsonSync(
        `${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
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
async function savedKeyPairStep(feepayerAlias, address) {
  if (!feepayerAlias) {
    // No fee payer alias, return early to prevent generating key pair with undefined alias
    log(chalk.red(`Invalid fee payer alias: ${feepayerAlias}.`));
    process.exit(1);
  }
  const keyPair = fs.readJsonSync(
    `${Constants.feePayerCacheDir}/${feepayerAlias}.json`
  );

  if (!address) address = keyPair.publicKey;

  return await step(
    `Use stored fee payer ${feepayerAlias} (public key: ${address}) `,

    async () => {
      return keyPair;
    }
  );
}

// Check if feepayer alias/aliases are stored on users machine and returns an array of them.
function getCachedFeepayerAliases() {
  let aliases = fs.readdirSync(Constants.feePayerCacheDir);

  aliases = aliases
    .filter((fileName) => fileName.includes('json'))
    .map((name) => name.slice(0, -5));

  return aliases;
}

function getCachedFeepayerAddress(feePayorAlias) {
  const address = fs.readJsonSync(
    `${Constants.feePayerCacheDir}/${feePayorAlias}.json`
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

export default config;
