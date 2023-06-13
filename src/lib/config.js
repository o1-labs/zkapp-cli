const fs = require('fs-extra');
const findPrefix = require('find-npm-prefix');
const os = require('os');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const { step } = require('./helpers');
const { green, red, bold, gray, reset } = require('chalk');
const Client = require('mina-signer');
const { prompts } = require('./prompts');

const log = console.log;

/**
 * Show existing deploy aliases in `config.json` and allow a user to add a new
 * deploy alias and url--and generate a key pair for it.
 * @returns {Promise<void>}
 */
async function config() {
  // Get project root, so the CLI command can be run anywhere inside their proj.
  const DIR = await findPrefix(process.cwd());
  // Get users home directory path.
  const HOME_DIR = os.homedir();

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
  let defaultFeePayerAlias;
  let cachedFeepayerAliases;
  let defaultFeePayerAddress;

  try {
    cachedFeepayerAliases = getCachedFeepayerAliases(HOME_DIR);
    defaultFeePayerAlias = cachedFeepayerAliases[0];
    defaultFeePayerAddress = getCachedFeepayerAddress(
      HOME_DIR,
      defaultFeePayerAlias
    );

    console.log('cachedFeepayerAliases', cachedFeepayerAliases);
    console.log('default feepayer', defaultFeePayerAddress);
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

  // TODO: Later, show pre-configured list to choose from or let user
  // add a custom deploy alias.

  function formatPrefixSymbol(state) {
    // Shows a cyan question mark when not submitted.
    // Shows a green check mark when submitted.
    // Shows a red "x" if ctrl+C is pressed.

    // Can't override the validating prefix or styling unfortunately
    // https://github.com/enquirer/enquirer/blob/8d626c206733420637660ac7c2098d7de45e8590/lib/prompt.js#L125
    // if (state.validating) return ''; // use no symbol, instead of pointer

    if (!state.submitted) return state.symbols.question;
    return state.cancelled ? red(state.symbols.cross) : state.symbols.check;
  }

  const initialPromptResponse = await prompt([
    ...prompts.deployAliasPrompts(config),
    ...prompts.initialFeepayerPrompts(
      defaultFeePayerAlias,
      defaultFeePayerAddress,
      isFeepayerCached
    ),
  ]);

  let recoverFeepayerResponse;
  if (initialPromptResponse.feepayer === 'recover') {
    recoverFeepayerResponse = await prompt(prompts.recoverFeepayerPrompts);
  }

  let otherFeepayerResponse;
  if (initialPromptResponse.feepayer === 'other') {
    otherFeepayerResponse = await prompt([
      {
        type: 'select',
        name: 'feepayer',
        choices: getFeepayorChoices(cachedFeepayerAliases),
        result() {
          return this.focused.value;
        },
      },
      {
        type: 'select',
        name: 'feePayerAlias',
        choices: cachedFeepayerAliases,
        message: (state) => {
          const style = state.submitted && !state.cancelled ? green : reset;
          return style('Choose another saved feepayer:');
        },
        skip() {
          return this.state.answers.feepayer !== 'alternateCachedFeepayer';
        },
        result() {
          // Workaround for a bug in enquirer that returns the first value of choices when the
          // question is skipped https://github.com/enquirer/enquirer/issues/340 .
          // This returns the previous prompt value if prompt is skipped.
          if (this.state.answers.feepayer !== 'alternateCachedFeepayer') {
            return this.state.answers.feepayer;
          }
        },
      },
    ]);
  }

  let feepayerAliasResponse;

  if (
    (initialPromptResponse?.feepayer !== 'defaultCache') &
    (otherFeepayerResponse?.feepayer !== 'alternateCachedFeepayer')
  ) {
    feepayerAliasResponse = await prompt([
      {
        type: 'input',
        name: 'feepayerAliasName',
        message: (state) => {
          const style = state.submitted && !state.cancelled ? green : reset;
          return style('Choose an alias for this account');
        },
        validate: async (val) => {
          val = val.toLowerCase().trim().replace(' ', '-');
          if (!val) return red('Feepayer alias is required.');
          return true;
        },
      },
    ]);
  }

  const promptResponse = {
    ...initialPromptResponse,
    ...recoverFeepayerResponse,
    ...otherFeepayerResponse,
    ...feepayerAliasResponse,
  };

  // If user presses "ctrl + c" during interactive prompt, exit.
  const { deployAliasName, url, fee, feepayerAliasName } = promptResponse;

  if (!deployAliasName || !url || !fee) return;

  const feepayerKeyPair = await step(
    `Create feepayer key pair at ${HOME_DIR}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
    async () => {
      const keyPair = createKeyPair('testnet');

      fs.outputJsonSync(
        `${HOME_DIR}/.cache/zkapp-cli/keys/${feepayerAliasName}.json`,
        keyPair,
        {
          spaces: 2,
        }
      );

      return keyPair;
    }
  );

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

// Check if feepayer alias/aliases are stored on users machine and returns an array of them.
function getCachedFeepayerAliases(directory) {
  let aliases = fs.readdirSync(`${directory}/.cache/zkapp-cli/keys/`);

  aliases = aliases
    .filter((fileName) => fileName.includes('json'))
    .map((name) => name.slice(0, -5));
  console.log('aliases', aliases);
  return aliases;
}

function getFeepayorChoices(cachedFeepayerAliases) {
  const choices = [
    {
      name: `Recover feepayer account from an existing base58 private key`,
      value: 'recover',
    },
    { name: 'Create a new feepayer key pair', value: 'create' },
  ];

  // Displays an additional prompt to select a different feepayer if more than one feepayer is cached
  if (cachedFeepayerAliases?.length > 1)
    choices.push({
      name: 'Choose another saved feeypayer',
      value: 'alternateCachedFeepayer',
    });

  return choices;
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
