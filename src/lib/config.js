import chalk from 'chalk';
import enquirer from 'enquirer';
import findPrefix from 'find-npm-prefix';
import fs from 'fs-extra';
import Client from 'mina-signer';
import { Lightnet, Mina, PrivateKey, PublicKey } from 'o1js';
import { getBorderCharacters, table } from 'table';
import Constants from './constants.js';
import { readDeployAliasesConfig, step } from './helpers.js';
import { isMinaGraphQlEndpointAvailable } from './network-helpers.js';
import { prompts } from './prompts.js';

// Module external API
export default config;

// Module internal API (exported for testing purposes)
export {
  createDeployAlias,
  createKeyPair,
  createKeyPairStep,
  createLightnetDeployAlias,
  createZkAppKeyPairAndSaveDeployAliasConfig,
  getCachedFeepayerAddress,
  getCachedFeepayerAliases,
  getExplorerName,
  printDeployAliasesConfig,
  printInteractiveDeployAliasConfigSuccessMessage,
  printLightnetDeployAliasConfigSuccessMessage,
  recoverKeyPairStep,
  savedKeyPairStep,
};

/**
 * Show existing deploy aliases in `config.json` and allow user to add a new
 * deploy alias.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {boolean} argv.list - Whether to list the available deploy aliases and their configurations.
 * @param {boolean} argv.lightnet - Whether to automatically configure the deploy alias compatible with the lightweight Mina blockchain network.
 * @returns {Promise<void>}
 */
async function config({ list, lightnet }) {
  // Get project root directory, so that the CLI command can be executed anywhere within the project.
  const projectRoot = await findPrefix(process.cwd());
  const deployAliasesConfig = readDeployAliasesConfig(projectRoot);
  if (list) {
    await printDeployAliasesConfig(deployAliasesConfig);
    return;
  }
  if (lightnet) {
    await createLightnetDeployAlias(projectRoot, deployAliasesConfig);
    return;
  }
  await createDeployAlias(projectRoot, deployAliasesConfig);
}

async function createLightnetDeployAlias(projectRoot, deployAliasesConfig) {
  const networkId = 'testnet';
  const deployAliasPrefix = 'lightnet';
  let nextAliasNumber = 1;
  await step(`Check Mina GraphQL endpoint availability`, async () => {
    const endpointStatus = await isMinaGraphQlEndpointAvailable(
      Constants.lightnetMinaDaemonGraphQlEndpoint
    );
    if (!endpointStatus) {
      throw new Error(
        `Mina GraphQL endpoint ${Constants.lightnetMinaDaemonGraphQlEndpoint} is not available.`
      );
    }
  });
  while (
    deployAliasesConfig.deployAliases[`${deployAliasPrefix}${nextAliasNumber}`]
  ) {
    nextAliasNumber++;
  }
  const deployAliasName = `${deployAliasPrefix}${nextAliasNumber}`;
  const feePayerPath = `${Constants.feePayerCacheDir}/${deployAliasName}.json`;
  if (!fs.existsSync(feePayerPath)) {
    await step(
      `Create zkApp fee payer key pair at ${feePayerPath}`,
      async () => {
        const minaNetworkInstance = Mina.Network({
          networkId,
          mina: Constants.lightnetMinaDaemonGraphQlEndpoint,
          lightnetAccountManager: Constants.lightnetAccountManagerEndpoint,
        });
        Mina.setActiveInstance(minaNetworkInstance);
        const keyPair = await Lightnet.acquireKeyPair();
        fs.outputJsonSync(
          feePayerPath,
          {
            publicKey: keyPair.publicKey.toBase58(),
            privateKey: keyPair.privateKey.toBase58(),
          },
          { spaces: 2 }
        );
      }
    );
  }
  await createZkAppKeyPairAndSaveDeployAliasConfig({
    deployAliasesConfig,
    projectRoot,
    deployAliasName,
    networkId,
    url: Constants.lightnetMinaDaemonGraphQlEndpoint,
    fee: '0.01',
    feepayerAlias: deployAliasName,
  });
  printLightnetDeployAliasConfigSuccessMessage(deployAliasName);
}

async function createDeployAlias(projectRoot, deployAliasesConfig) {
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

  await printDeployAliasesConfig(deployAliasesConfig);
  console.log('Enter values to create a deploy alias:');

  const {
    deployAliasPrompts,
    initialFeepayerPrompts,
    recoverFeepayerPrompts,
    otherFeepayerPrompts,
    feepayerAliasPrompt,
  } = prompts;
  const initialPromptResponse = await enquirer.prompt([
    ...deployAliasPrompts(deployAliasesConfig),
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
    networkId,
    url,
    fee,
    feepayer,
    feepayerAlias,
    feepayerKey,
    alternateCachedFeepayerAlias,
  } = promptResponse;

  if (!deployAliasName || !url || !fee) process.exit(1);

  let feepayerKeyPair;
  switch (feepayer) {
    case 'create':
      feepayerKeyPair = await createKeyPairStep(feepayerAlias, networkId);
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
      console.log(
        chalk.red(`Invalid fee payer option: ${feepayer ?? 'none'}.`)
      );
      process.exit(1);
  }

  await createZkAppKeyPairAndSaveDeployAliasConfig({
    deployAliasesConfig,
    projectRoot,
    deployAliasName,
    networkId,
    url,
    fee,
    feepayerAlias,
  });
  printInteractiveDeployAliasConfigSuccessMessage(
    deployAliasesConfig,
    deployAliasName,
    feepayerKeyPair
  );
}

async function createZkAppKeyPairAndSaveDeployAliasConfig({
  deployAliasesConfig,
  projectRoot,
  deployAliasName,
  networkId,
  url,
  fee,
  feepayerAlias,
}) {
  await step(
    `Create zkApp key pair at keys/${deployAliasName}.json`,
    async () => {
      const keyPair = createKeyPair(networkId);
      fs.outputJsonSync(
        `${projectRoot}/keys/${deployAliasName}.json`,
        keyPair,
        {
          spaces: 2,
        }
      );
      return keyPair;
    }
  );
  await step(`Add deploy alias to config.json`, async () => {
    if (!feepayerAlias) {
      // No fee payer alias, return early to prevent creating a deploy alias with invalid fee payer
      console.log(chalk.red(`Invalid fee payer alias ${feepayerAlias}" .`));
      process.exit(1);
    }
    deployAliasesConfig.deployAliases[deployAliasName] = {
      networkId,
      url,
      keyPath: `keys/${deployAliasName}.json`,
      feepayerKeyPath: `${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
      feepayerAlias,
      fee,
    };
    fs.outputJsonSync(`${projectRoot}/config.json`, deployAliasesConfig, {
      spaces: 2,
    });
  });
}

// Creates a new feepayer key pair
async function createKeyPairStep(feepayerAlias, networkId) {
  if (!feepayerAlias) {
    // No fee payer alias, return early to prevent generating key pair with undefined alias
    console.log(chalk.red(`Invalid fee payer alias ${feepayerAlias}.`));
    process.exit(1);
  }
  return await step(
    `Create fee payer key pair at ${Constants.feePayerCacheDir}/${feepayerAlias}.json`,
    async () => {
      const keyPair = createKeyPair(networkId);

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
    console.log(chalk.red(`Invalid fee payer alias: ${feepayerAlias}.`));
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
    .filter((fileName) => fileName.endsWith('.json'))
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

async function printDeployAliasesConfig(deployAliasesConfig) {
  // Build table of existing deploy aliases found in their config.json
  let tableData = [
    [chalk.bold('Name'), chalk.bold('URL'), chalk.bold('Smart Contract')],
  ];
  for (const deployAliasName in deployAliasesConfig.deployAliases) {
    const { url, smartContract } =
      deployAliasesConfig.deployAliases[deployAliasName];
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
  console.log(msg);
}

function printInteractiveDeployAliasConfigSuccessMessage(
  deployAliasesConfig,
  deployAliasName,
  feepayerKeyPair
) {
  const explorerName = getExplorerName(
    deployAliasesConfig.deployAliases[deployAliasName]?.url
  );
  const str =
    `\nSuccess!\n` +
    `\nNext steps:` +
    `\n  - If this is the testnet, request tMINA at:\n    https://faucet.minaprotocol.com/?address=${encodeURIComponent(
      feepayerKeyPair.publicKey
    )}` +
    (explorerName ? `&explorer=${explorerName}` : '') +
    `\n  - To deploy zkApp, run: \`zk deploy ${deployAliasName}\``;
  console.log(chalk.green(str));
}

function printLightnetDeployAliasConfigSuccessMessage(deployAliasName) {
  const str =
    `\nSuccess!\n` +
    `\nNext steps:` +
    `\n  - To deploy zkApp, run: \`zk deploy ${deployAliasName}\``;
  console.log(chalk.green(str));
}
