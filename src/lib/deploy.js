const sh = require('child_process').execSync;
const fs = require('fs-extra');
const findPrefix = require('find-npm-prefix');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const glob = require('fast-glob');
const { step } = require('./helpers');
// const graphql = require('graphql.js');

const { red, green, bold, reset } = require('chalk');
const log = console.log;

/**
 * Deploy a smart contract to the specified network. If no network param is
 * provided, yargs will tell the user that the network param is required.
 * @param {string} network Network name to deploy to.
 * @param {string} yes     Run non-interactively. I.e. skip confirmation steps.
 * @return {void}          Sends tx to a relayer, if confirmed by user.
 */
async function deploy({ network, yes }) {
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

  network = network.toLowerCase();

  if (!config.networks[network]) {
    log(red('Network name not found in config.json.'));
    log(red('You can add a network by running `zk config`.'));
    return;
  }

  if (!config.networks[network].url) {
    log(red(`No 'url' property is specified for this network in config.json.`));
    log(red(`Please correct your config.json and try again.`));
    return;
  }

  await step('Build project', async () => {
    fs.emptyDirSync(`${DIR}/build`); // ensure old artifacts don't remain
    await sh('npm run build --silent');
  });

  const build = await step('Generate build.json', async () => {
    // Identify all instances of SmartContract in the build.
    const smartContracts = await findSmartContracts(`${DIR}/build/**/*.js`);

    fs.outputJsonSync(
      `${DIR}/build/build.json`,
      { smartContracts },
      { spaces: 2 }
    );

    return { smartContracts };
  });

  // Identify which smart contract should be deployed for this network.
  let contractName = chooseSmartContract(config, build, network);

  // If no smart contract is specified for this network in config.json &
  // 2+ smart contracts exist in build.json, ask which they want to use.
  if (!contractName) {
    const res = await prompt({
      type: 'select',
      name: 'contractName',
      choices: build.smartContracts,
      message: (state) => {
        // Makes the step text green upon success, else uses reset.
        const style =
          state.submitted && !state.cancelled ? state.styles.success : reset;
        return style('Choose smart contract to deploy');
      },
      prefix: (state) => {
        // Shows a cyan question mark when not submitted.
        // Shows a green check mark if submitted.
        // Shows a red "x" if ctrl+C is pressed (default is a magenta).
        if (!state.submitted) return state.symbols.question;
        return !state.cancelled
          ? state.symbols.check
          : red(state.symbols.cross);
      },
    });
    contractName = res.contractName;
  } else {
    // Can't include the log message inside this callback b/c it will mess up
    // the step formatting.
    await step('Choose smart contract', async () => {});

    if (config.networks[network]?.smartContract) {
      log(
        `  The '${config.networks[network]?.smartContract}' smart contract will be used\n  for this network as specified in config.json.`
      );
    } else {
      log(
        `  Only one smart contract exists in the project: ${build.smartContracts[0]}`
      );
    }
  }

  // Set the default smartContract name for this network in config.json.
  // Occurs when this is the first time we're deploying to a given network.
  // Important to ensure the same smart contract will always be deployed to
  // the same network.
  if (config.networks[network]?.smartContract !== contractName) {
    config.networks[network].smartContract = contractName;
    fs.writeJSONSync(`${DIR}/config.json`, config, { spaces: 2 });
    log(
      `  Your config.json was updated to always use this\n  smart contract when deploying to this network.`
    );
  }

  await step('Generate verification key', async () => {
    // TODO: BLOCKED Generate the verification key.
  });

  await step('Build transaction', async () => {
    // TODO: BLOCKED Build the zkApp tx.
  });

  await step('Sign transaction', async () => {
    // const { privateKey } = fs.readJSONSync(`${DIR}/keys/${network}.json`);
    // TODO: BLOCKED Sign the zkApp tx.
  });

  const settings = [
    [bold('Network'), reset(network)],
    [bold('Url'), reset(config.networks[network].url)],
    [bold('Smart Contract'), reset(contractName)],
  ];

  let confirm;
  if (yes) {
    // Run non-interactively b/c user specified `--yes` or `-y`.
    confirm = 'yes';
  } else {
    // This is verbose, but creates ideal UX steps--expected colors & symbols.
    let res = await prompt({
      type: 'input',
      name: 'confirm',
      message: (state) => {
        // Makes the step text green upon success.
        const x = state.input.toLowerCase();
        const style =
          state.submitted && (x === 'yes' || x === 'y')
            ? state.styles.success
            : reset;

        return (
          style('Confirm to send transaction\n\n  ') +
          table(settings, {
            border: getBorderCharacters('norc'),
          }).replaceAll('\n', '\n  ') +
          '\n  Are you sure you want to send (yes/no)?'
        );
      },
      prefix: (state) => {
        // Shows a cyan question mark when not submitted.
        // Shows a green check mark if "yes" or "y" is submitted.
        // Shows a red "x" if any other text is submitted or ctrl+C is pressed.
        if (!state.submitted) return state.symbols.question;
        let x = state.input.toLowerCase();
        return x === 'yes' || x === 'y'
          ? state.symbols.check
          : red(state.symbols.cross);
      },
      result: (val) => {
        // Using a text input b/c we want to require pressing "enter". But
        // we need to fail if any answer other than "yes" or "y" is given.
        val = val.toLowerCase();
        if (!(val === 'yes' || val === 'y')) {
          log('  Aborted. Transaction not sent.');
          process.exit();
        }
        return val;
      },
    });

    confirm = res.confirm;
  }

  // Fail safe, in case of prompt issues, to not send tx unless 100% intended.
  if (!(confirm === 'yes' || confirm === 'y')) return;

  // Send tx to the relayer.
  const txId = await step('Send to network', async () => {
    // const graph = graphql(config.networks[network].url);
    // const result = await graph(``, {}); // TODO: BLOCKED Write query
    // return result;

    // TODO: ~Remove demo data below.
    // throw new Error('something wrong occurred');
    return 'abc123456';
  });

  if (!txId) {
    // Note that the thrown error object is already console logged via step().
    log(red('  Failed to send transaction to relayer. Please try again.'));
    return;
  }

  const txUrl = `https://minaexplorer.com/transaction/${txId}`;

  const str =
    `\nSuccess! Deploy transaction sent.` +
    `\n` +
    `\nNext step:` +
    `\n  Your smart contract will be live (or updated)` +
    `\n  as soon as the transaction is included in a block:` +
    `\n  ${txUrl}`;

  log(green(str));
}

/**
 * Find the user-specified class names for every instance of `SmartContract`
 * in the build dir.
 * @param {string} path The glob pattern--e.g. `build/**\/*.js`
 * @returns {array}     The user-specified class names--e.g. ['Foo', 'Bar']
 */
async function findSmartContracts(path) {
  const files = await glob(path);

  let smartContracts = [];
  for (const file of files) {
    const str = fs.readFileSync(file, 'utf-8');
    let results = str.matchAll(/class (\w*) extends SmartContract/gi);
    results = Array.from(results) ?? []; // prevent error if no results
    results = results.map((result) => result[1]); // only keep capture groups
    smartContracts.push(...results);
  }

  return smartContracts;
}

/**
 * Choose which smart contract should be deployed for this network.
 * @param {object} config  The config.json in object format.
 * @param {object} deploy  The build/build.json in object format.
 * @returns {string}       The smart contract name.
 */
function chooseSmartContract(config, deploy, network) {
  // If the network in config.json has a smartContract specified, use it.
  if (config.networks[network]?.smartContract) {
    return config.networks[network]?.smartContract;
  }

  // If only one smart contract exists in the build, use it.
  if (deploy.smartContracts.length === 1) {
    return deploy.smartContracts[0];
  }

  // If 2+ smartContract classes exist in build.json, return falsy.
  // We'll need to ask the user which they want to use for this network.
  return '';
}

module.exports = {
  deploy,
  findSmartContracts,
  chooseSmartContract,
};
