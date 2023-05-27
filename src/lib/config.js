const fs = require('fs-extra');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const {
  step,
  configRead,
  projRoot,
  genKeys,
  DEFAULT_GRAPHQL,
} = require('./helpers');
const { green, red, bold, gray, reset } = require('chalk');

const log = console.log;

const DEFAULT_FEE = '0.1';

/**
 * Show existing deploy aliases in `config.json` and allow a user to add a new
 * deploy alias and url--and generate a key pair for it.
 * @returns {Promise<void>}
 */
async function config() {
  const DIR = await projRoot();
  const config = await configRead();

  // Checks if developer has the legacy networks in config.json and renames it to deploy aliases.
  if (Object.prototype.hasOwnProperty.call(config, 'networks')) {
    Object.assign(config, { deployAliases: config.networks });
    delete config.networks;
  }

  // Build table of existing deploy aliases found in their config.json
  let tableData = [[bold('Name'), bold('Url'), bold('Smart Contract')]];
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

  log('Add a new deploy alias:');

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

  const response = await prompt([
    {
      type: 'input',
      name: 'deployAliasName',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose a name (can be anything):');
      },
      prefix: formatPrefixSymbol,
      validate: async (val) => {
        val = val.toLowerCase().trim().replace(' ', '-');
        if (!val) return red('Name is required.');
        if (Object.keys(config.deployAliases).includes(val)) {
          return red('Name already exists.');
        }
        return true;
      },
      result: (val) => val.toLowerCase().trim().replace(' ', '-'),
    },
    {
      type: 'input',
      name: 'url',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style(`Set the Mina GraphQL API URL to deploy to
  Press enter for default ${DEFAULT_GRAPHQL}:`);
      },
      prefix: formatPrefixSymbol,
      result: (val) => (val ? val.trim().replace(/ /, '') : DEFAULT_GRAPHQL),
    },
    {
      type: 'input',
      name: 'fee',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style(
          `Set transaction fee to use when deploying (in MINA)\n  Press enter for defualt ${DEFAULT_FEE}`
        );
      },
      prefix: formatPrefixSymbol,
      validate: (val) => {
        if (!val) return true;
        if (isNaN(val)) return red('Fee must be a number.');
        if (val < 0) return red("Fee can't be negative.");
        return true;
      },
      result: (val) => (val ? val.trim().replace(/ /, '') : DEFAULT_FEE),
    },
  ]);

  // If user presses "ctrl + c" during interactive prompt, exit.
  const { deployAliasName, url, fee } = response;
  if (!deployAliasName || !url || !fee) return;

  // TODO allow user to choose an existing key or generate new
  const keyPair = await step(
    `Create key pair at keys/${deployAliasName}.json`,
    async () => await genKeys({ deployAliasName }) // TODO: Make this configurable for mainnet and testnet.
  );

  await step(`Add deploy alias to config.json`, async () => {
    config.deployAliases[deployAliasName] = {
      url,
      keyPath: `keys/${deployAliasName}.json`,
      fee,
    };
    fs.outputJsonSync(`${DIR}/config.json`, config, { spaces: 2 });
  });

  const explorerName = getExplorerName(
    config.deployAliases[deployAliasName]?.url
  );

  const success = `\nSuccess!\n` + `\nNew deploy alias: ${deployAliasName}`;
  log(green(success));
  log(config.deployAliases[deployAliasName]);

  const nextSteps =
    `\nNext steps:` +
    `\n  - If this is a testnet, request tMINA at:\n    https://faucet.minaprotocol.com/?address=${encodeURIComponent(
      keyPair.publicKey
    )}&?explorer=${explorerName}` +
    `\n  - To deploy, run: \`zk deploy ${deployAliasName}\``;

  log(green(nextSteps));
}

/**
 * Display the contents of `config.json`
 * @param {string} alias Name of the deploy alias
 * @returns {Promise<void>}
 */
async function configShow(alias) {
  const config = await configRead();
  if (!alias) {
    log(config);
    return;
  }
  // deploy alias must exist to display
  const aliases = Object.keys(config.deployAliases);
  if (!aliases.includes(alias)) {
    console.error(red(`Invalid deploy alias: ${alias}`));
    log('Available deploy aliases:', aliases);
    return;
  }
  log('Deploy alias:', alias);
  log(config.deployAliases[alias]);
  return;
}

function getExplorerName(graphQLUrl) {
  return new URL(graphQLUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
}

module.exports = {
  config,
  configShow,
};
