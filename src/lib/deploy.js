const sh = require('child_process').execSync;
const fs = require('fs-extra');
const path = require('path');
const findPrefix = require('find-npm-prefix');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const glob = require('fast-glob');
const { step } = require('./helpers');
const fetch = require('node-fetch');

const { red, green, bold, reset } = require('chalk');
const log = console.log;

const DEFAULT_GRAPHQL = 'https://proxy.berkeley.minaexplorer.com/graphql'; // The endpoint used to interact with the network

/**
 * Deploy a smart contract to the specified network. If no network param is
 * provided, yargs will tell the user that the network param is required.
 * @param {string} network Network name to deploy to.
 * @param {string} yes     Run non-interactively. I.e. skip confirmation steps.
 * @return {Promise<void>} Sends tx to a relayer, if confirmed by user.
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

  if (!network) {
    const networks = Object.keys(config?.networks);
    if (!networks.length) {
      log(red('No network aliases found in config.json.'));
      log(red('Run `zk config` to add a network alias, then try again.'));
      return;
    }

    const res = await prompt({
      type: 'select',
      name: 'network',
      choices: networks,
      message: (state) => {
        // Makes the step text green upon success, else uses reset.
        const style =
          state.submitted && !state.cancelled ? state.styles.success : reset;
        return style('Which network alias would you like to deploy to?');
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
    network = res.network;
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

  // Find the users file to import the smart contract from
  let smartContractFile = await findSmartContractToDeploy(
    `${DIR}/build/**/*.js`,
    contractName
  );

  let smartContractImports;
  // import snarkyjs from the user directory
  let { isReady, shutdown, PrivateKey, addCachedAccount, Mina } = await import(
    `${DIR}/node_modules/snarkyjs/dist/server/index.mjs`
  );
  try {
    smartContractImports = await import(
      `${DIR}/build/src/${smartContractFile}`
    );
  } catch (_) {
    log(
      red(
        `  Failed to find the "${contractName}" smart contract in your build directory.\n Please confirm that your config.json contains the name of the smart contract that you desire to deploy to this network alias.`
      )
    );
    await shutdown();
    return;
  }

  // Attempt to import the smart contract class to deploy from the user's file.
  // If we cannot find the named export log an error message and return early.
  if (!(contractName in smartContractImports)) {
    log(
      red(
        `  Failed to find the "${contractName}" smart contract in your build directory.\n Check that you have exported your smart contract class using a named export and try again.`
      )
    );
    await shutdown();
    return;
  }

  // Attempt to import the private key from the `keys` directory. This private key will be used to deploy the zkApp.
  let privateKey;
  try {
    privateKey = fs.readJSONSync(`${DIR}/keys/${network}.json`).privateKey;
  } catch (_) {
    log(
      red(
        `  Failed to find the zkApp private key.\n  Please make sure your config.json has the correct 'keyPath' property.`
      )
    );
    await shutdown();
    return;
  }

  await isReady;

  let zkApp = smartContractImports[contractName]; //  The specified zkApp class to deploy
  let zkAppPrivateKey = PrivateKey.fromBase58(privateKey); //  The private key of the zkApp
  let zkAppAddress = zkAppPrivateKey.toPublicKey(); //  The public key of the zkApp

  const verificationKey = await step(
    'Generate verification key (takes 1-2 min)',
    async () => {
      let { verificationKey } = await zkApp.compile(zkAppAddress);
      return verificationKey;
    }
  );

  let { fee } = config.networks[network];
  if (!fee) {
    log(
      red(
        `  The "fee" property is not specified for this network alias in config.json. Please update your config.json and try again.`
      )
    );
    await shutdown();
    return;
  }
  fee = `${Number(fee) * 1e9}`; // in nanomina (1 billion = 1.0 mina)

  const graphQLEndpoint = config?.networks[network]?.url ?? DEFAULT_GRAPHQL;
  const zkAppAddressBase58 = zkAppAddress.toBase58();
  const accountQuery = getAccountQuery(zkAppAddressBase58);
  const accountResponse = await sendGraphQL(graphQLEndpoint, accountQuery);

  let nonce = 0;
  if (yes && !accountResponse?.data?.account?.nonce) {
    // If running in non-interactive mode and no nonce is found, show an error message and return early
    log(
      red(
        `  Failed to find the account nonce.\n  Please run in interactive mode and specify an account nonce.`
      )
    );
    return;
  } else if (!yes && !accountResponse?.data?.account?.nonce) {
    // If running in interactive mode and no nonce is found, ask for the user's input
    let nonceResponse = await prompt({
      type: 'input',
      name: 'nonce',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style(
          'Could not find account nonce. Please confirm the nonce of the account:'
        );
      },
      validate: (val) => {
        if (!val) return red('Nonce is required.');
        if (isNaN(val)) return red('Nonce must be a number.');
        if (val < 0) return red("Nonce can't be negative.");
        return true;
      },
      result: (val) => val.trim().replace(/ /, ''),
    });
    nonce = Number(nonceResponse.nonce);
  } else {
    // Account nonce value is found from the network
    nonce = Number(accountResponse.data.account.nonce);
  }

  let transactionJson = await step('Build transaction', async () => {
    addCachedAccount({ publicKey: zkAppAddressBase58, nonce });
    let tx = await Mina.transaction(
      { feePayerKey: zkAppPrivateKey, fee },
      () => {
        let zkapp = new zkApp(zkAppAddress);
        zkapp.deploy({ verificationKey, zkappKey: zkAppPrivateKey });
        // hack: manually increment nonce
        let nonce = zkapp.self.body.accountPrecondition.nonce.lower.add(1);
        zkapp.self.body.accountPrecondition.nonce.assertBetween(nonce, nonce);
      }
    );
    return tx.sign().toJSON();
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
  const txn = await step('Send to network', async () => {
    const zkAppMutation = sendZkAppQuery(transactionJson);
    try {
      return (await sendGraphQL(graphQLEndpoint, zkAppMutation)).data.sendZkapp
        .zkapp;
    } catch (error) {
      return error;
    }
  });

  if (!txn || txn?.kind === 'error') {
    // Note that the thrown error object is already console logged via step().
    log(red('  Failed to send transaction to relayer. Please try again.'));
    return;
  }

  const txUrl = `https://berkeley.minaexplorer.com/transaction/${txn.hash}`; // TODO: Make this configurable
  const str =
    `\nSuccess! Deploy transaction sent.` +
    `\n` +
    `\nNext step:` +
    `\n  Your smart contract will be live (or updated)` +
    `\n  as soon as the transaction is included in a block:` +
    `\n  ${txUrl}`;

  log(green(str));
  await shutdown();
}

/**
 * Find the user-specified class names for every instance of `SmartContract`
 * in the build dir.
 * @param {string} path The glob pattern--e.g. `build/**\/*.js`
 * @returns {Promise<array>} The user-specified class names--e.g. ['Foo', 'Bar']
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

/**
 * Find the file name of the smart contract to be deployed.
 * @param {string}    buildPath    The glob pattern--e.g. `build/**\/*.js`
 * @param {string}    contractName The user-specified contract name to deploy.
 * @returns {Promise<string>}      The file name of the user-specified smart contract.
 */
async function findSmartContractToDeploy(buildPath, contractName) {
  const files = await glob(buildPath);
  const re = new RegExp(`class ${contractName} extends SmartContract`, 'gi');
  for (const file of files) {
    const contract = fs.readFileSync(file, 'utf-8');
    if (re.test(contract)) {
      return path.basename(file);
    }
  }
}

async function sendGraphQL(graphQLEndpoint, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 20000); // Default to use 20s as a timeout
  let response;
  try {
    let body = JSON.stringify({ operationName: null, query, variables: {} });
    response = await fetch(graphQLEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    const responseJson = await response.json();
    if (!response.ok) {
      return {
        kind: 'error',
        statusCode: response.status,
        statusText: response.statusText,
        message: responseJson.errors,
      };
    }
    return responseJson;
  } catch (error) {
    clearTimeout(timer);
    return {
      kind: 'error',
      message: error,
    };
  }
}

function sendZkAppQuery(partiesJson) {
  return `
  mutation {
    sendZkapp(input: {
      parties: ${removeJsonQuotes(partiesJson)}
    }) { zkapp
      {
        id
        hash
        failureReason {
          index
          failures
        }
      }
    }
  }`;
}

function getAccountQuery(publicKey) {
  return `
  query {
    account(publicKey: "${publicKey}") {
      publicKey
      nonce
    }
  }`;
}

function removeJsonQuotes(json) {
  // source: https://stackoverflow.com/a/65443215
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (match) =>
    match.replace(/"/g, '')
  );
}

module.exports = {
  deploy,
  findSmartContracts,
  chooseSmartContract,
};
