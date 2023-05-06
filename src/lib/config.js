const fs = require('fs-extra');
const findPrefix = require('find-npm-prefix');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const { step } = require('./helpers');
const { green, red, bold, gray, reset } = require('chalk');
const Client = require('mina-signer');

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

  console.log('Add a new deploy alias:');

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
        return style('Set the Mina GraphQL API URL to deploy to:');
      },
      prefix: formatPrefixSymbol,
      validate: (val) => {
        if (!val) return red('Url is required.');
        return true;
      },
      result: (val) => val.trim().replace(/ /, ''),
    },
    {
      type: 'input',
      name: 'fee',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Set transaction fee to use when deploying (in MINA):');
      },
      prefix: formatPrefixSymbol,
      validate: (val) => {
        if (!val) return red('Fee is required.');
        if (isNaN(val)) return red('Fee must be a number.');
        if (val < 0) return red("Fee can't be negative.");
        return true;
      },
      result: (val) => val.trim().replace(/ /, ''),
    },
    {
      type: 'select',
      name: 'feepayer',
      choices: [
        {
          name: 'Recover fee-payer account from an existing base58 private key',
          value: 'recover',
        },
        { name: 'Create a new fee-payer key pair', value: 'create' },
      ],
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an account to pay transaction fees:');
      },
      result() {
        return this.focused.value;
      },
    },
    {
      type: 'input',
      name: 'feepayerKey',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Account private key (base58):');
      },
    },
    {
      type: 'input',
      name: 'feepayerAlias',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an alias for this account:');
      },
    },
  ]);

  // If user presses "ctrl + c" during interactive prompt, exit.
  const { deployAliasName, url, fee } = response;

  if (!deployAliasName || !url || !fee) return;

  const keyPair = await step(
    `Create key pair at keys/${deployAliasName}.json`,
    async () => {
      const client = new Client({ network: 'testnet' }); // TODO: Make this configurable for mainnet and testnet.
      let keyPair = client.genKeys();
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
      keyPair.publicKey
    )}&?explorer=${explorerName}` +
    `\n  - To deploy, run: \`zk deploy ${deployAliasName}\``;

  log(green(str));
}

function getExplorerName(graphQLUrl) {
  return new URL(graphQLUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
}
module.exports = {
  config,
};
