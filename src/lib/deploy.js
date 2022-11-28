const sh = require('child_process').execSync;
const fs = require('fs-extra');
const path = require('path');
const findPrefix = require('find-npm-prefix');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const glob = require('fast-glob');
const { step } = require('./helpers');
const fetch = require('node-fetch');
const util = require('util');

const { red, green, bold, reset } = require('chalk');
const log = console.log;

const DEFAULT_GRAPHQL = 'https://proxy.berkeley.minaexplorer.com/graphql'; // The endpoint used to interact with the network

/**
 * Deploy a smart contract to the specified network. If no network param is
 * provided, yargs will tell the user that the network param is required.
 * @param {string} alias   The deploy alias to deploy to.
 * @param {string} yes     Run non-interactively. I.e. skip confirmation steps.
 * @return {Promise<void>} Sends tx to a relayer, if confirmed by user.
 */
async function deploy({ alias, yes }) {
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

  if (!alias) {
    const aliases = Object.keys(config?.networks);
    if (!aliases.length) {
      log(red('No deploy aliases found in config.json.'));
      log(red('Run `zk config` to add a deploy alias, then try again.'));
      return;
    }

    const res = await prompt({
      type: 'select',
      name: 'network',
      choices: aliases,
      message: (state) => {
        // Makes the step text green upon success, else uses reset.
        const style =
          state.submitted && !state.cancelled ? state.styles.success : reset;
        return style('Which deploy alias would you like to deploy to?');
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
    alias = res.network;
  }

  alias = alias.toLowerCase();

  if (!config.networks[alias]) {
    log(red('Network name not found in config.json.'));
    log(red('You can add a network by running `zk config`.'));
    return;
  }

  if (!config.networks[alias].url) {
    log(red(`No 'url' property is specified for this network in config.json.`));
    log(red(`Please correct your config.json and try again.`));
    return;
  }

  await step('Build project', async () => {
    // store cache to add after build directory is emptied
    let cache;
    try {
      cache = fs.readJsonSync(`${DIR}/build/cache.json`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        cache = {};
      } else {
        console.error(err);
      }
    }

    fs.emptyDirSync(`${DIR}/build`); // ensure old artifacts don't remain
    fs.outputJsonSync(`${DIR}/build/cache.json`, cache, { spaces: 2 });

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
  let contractName = chooseSmartContract(config, build, alias);

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

    if (config.networks[alias]?.smartContract) {
      log(
        `  The '${config.networks[alias]?.smartContract}' smart contract will be used\n  for this network as specified in config.json.`
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
  if (config.networks[alias]?.smartContract !== contractName) {
    config.networks[alias].smartContract = contractName;
    fs.writeJSONSync(`${DIR}/config.json`, config, { spaces: 2 });
    log(
      `  Your config.json was updated to always use this\n  smart contract when deploying to this network.`
    );
  }

  // import snarkyjs from the user directory
  let snarkyjsImportPath = `${DIR}/node_modules/snarkyjs/dist/node/index.js`;
  if (process.platform === 'win32') {
    snarkyjsImportPath = 'file://' + snarkyjsImportPath;
  }
  let { isReady, shutdown, PrivateKey, Mina, Bool } = await import(
    snarkyjsImportPath
  );

  const graphQLEndpoint = config?.networks[alias]?.url ?? DEFAULT_GRAPHQL;
  const { data: nodeStatus } = await sendGraphQL(
    graphQLEndpoint,
    `query {
      syncStatus
    }`
  );

  if (!nodeStatus || nodeStatus.syncStatus === 'OFFLINE') {
    log(
      red(
        `  Transaction relayer node is offline. Please try again or use a different "url" for this deploy alias in your config.json`
      )
    );
    await shutdown();
    return;
  } else if (nodeStatus.syncStatus !== 'SYNCED') {
    log(
      red(
        `  Transaction relayer node is not in a synced state. Its status is "${nodeStatus.syncStatus}".\n  Please try again when the node is synced or use a different "url" for this deploy alias in your config.json`
      )
    );
    await shutdown();
    return;
  }

  // Find the users file to import the smart contract from
  let smartContractFile = await findSmartContractToDeploy(
    `${DIR}/build/**/*.js`,
    contractName
  );

  let smartContractImports;
  try {
    let smartContractImportPath = `${DIR}/build/src/${smartContractFile}`;
    if (process.platform === 'win32') {
      smartContractImportPath = 'file://' + smartContractImportPath;
    }
    smartContractImports = await import(smartContractImportPath);
  } catch (_) {
    log(
      red(
        `  Failed to find the "${contractName}" smart contract in your build directory.\n  Please confirm that your config.json contains the name of the smart contract that you desire to deploy to this deploy alias.`
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
        `  Failed to find the "${contractName}" smart contract in your build directory.\n  Check that you have exported your smart contract class using a named export and try again.`
      )
    );
    await shutdown();
    return;
  }

  // Attempt to import the private key from the `keys` directory. This private key will be used to deploy the zkApp.
  let privateKey;
  try {
    privateKey = fs.readJSONSync(`${DIR}/keys/${alias}.json`).privateKey;
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

  // figure out if the zkApp has a @method init() - in that case we need to create a proof,
  // so we need to compile no matter what, and we show a separate step to create the proof
  let isInitMethod = zkApp._methods?.some((intf) => intf.methodName === 'init');

  const { verificationKey, isCached } = await step(
    'Generate verification key (takes 10-30 sec)',
    async () => {
      let cache = fs.readJsonSync(`${DIR}/build/cache.json`);
      // compute a hash of the contract's circuit to determine if 'zkapp.compile' should re-run or cached verfification key can be used
      let currentDigest = await zkApp.digest(zkAppAddress);

      // initialize cache if 'zk deploy' is run the first time on the contract
      if (!cache[contractName]) {
        cache[contractName] = { digest: '', verificationKey: '' };
      }

      if (!isInitMethod && cache[contractName]?.digest === currentDigest) {
        return {
          verificationKey: cache[contractName].verificationKey,
          isCached: true,
        };
      } else {
        const { verificationKey } = await zkApp.compile(zkAppAddress);
        // update cache with new verification key and currrentDigest
        cache[contractName].verificationKey = verificationKey;
        cache[contractName].digest = currentDigest;

        fs.writeJsonSync(`${DIR}/build/cache.json`, cache, {
          spaces: 2,
        });

        return { verificationKey, isCached: false };
      }
    }
  );

  // Can't include the log message inside the callback b/c it will break
  // the step formatting.
  if (isCached) {
    log('  Using the cached verification key');
  }

  let { fee } = config.networks[alias];
  if (!fee) {
    log(
      red(
        `  The "fee" property is not specified for this deploy alias in config.json. Please update your config.json and try again.`
      )
    );
    await shutdown();
    return;
  }
  fee = `${Number(fee) * 1e9}`; // in nanomina (1 billion = 1.0 mina)

  const zkAppAddressBase58 = zkAppAddress.toBase58();
  const accountQuery = getAccountQuery(zkAppAddressBase58);
  const accountResponse = await sendGraphQL(graphQLEndpoint, accountQuery);

  if (!accountResponse?.data?.account) {
    // No account is found, show an error message and return early
    log(
      red(
        `  Failed to find the fee payer's account on chain.\n  Please make sure the account "${zkAppAddressBase58}" has previously been funded.`
      )
    );
    await shutdown();
    return;
  }

  let transaction = await step('Build transaction', async () => {
    let Network = Mina.Network(graphQLEndpoint);
    Mina.setActiveInstance(Network);
    let tx = await Mina.transaction(
      { feePayerKey: zkAppPrivateKey, fee },
      () => {
        let zkapp = new zkApp(zkAppAddress);
        zkapp.deploy({ verificationKey, zkappKey: zkAppPrivateKey });
        // manually patch the tx (TODO: have this implemented properly in snarkyjs)
        // remove the nonce precondition
        zkapp.self.body.preconditions.account.nonce.isSome = Bool(false);
        // don't increment the nonce
        zkapp.self.body.incrementNonce = Bool(false);
        // use full commitment (means with include the fee payer in the signature, so we're protected against replays)
        zkapp.self.body.useFullCommitment = Bool(true);
      }
    );
    return { tx, json: tx.sign().toJSON() };
  });

  if (isInitMethod) {
    transaction = await step(
      'Create transaction proof (takes 10-30 sec)',
      async () => {
        await transaction.tx.prove();
        return { tx: transaction.tx, json: transaction.tx.sign().toJSON() };
      }
    );
  }
  let transactionJson = transaction.json;

  const settings = [
    [bold('Network'), reset(alias)],
    [bold('Url'), reset(config.networks[alias].url)],
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
          process.exit(1);
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
      return await sendGraphQL(graphQLEndpoint, zkAppMutation);
    } catch (error) {
      return error;
    }
  });

  if (!txn || txn?.kind === 'error') {
    // Note that the thrown error object is already console logged via step().
    log(red(getErrorMessage(txn)));
    await shutdown();
    return;
  }

  const txUrl = `https://berkeley.minaexplorer.com/transaction/${txn.data.sendZkapp.zkapp.hash}`; // TODO: Make the network configurable
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
  if (process.platform === 'win32') {
    path = path.replaceAll('\\', '/');
  }
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
  if (process.platform === 'win32') {
    buildPath = buildPath.replaceAll('\\', '/');
  }
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
    if (!response.ok || responseJson?.errors) {
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

function sendZkAppQuery(acountUpdatesJson) {
  return `
  mutation {
    sendZkapp(input: {
      zkappCommand: ${removeJsonQuotes(acountUpdatesJson)}
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
      nonce
    }
  }`;
}

function getErrorMessage(error) {
  let errors = error?.message;
  if (!Array.isArray(errors)) {
    return `Failed to send transaction. Unknown error: ${util.format(error)}`;
  }
  let errorMessage =
    '  Failed to send transaction to relayer. Errors: ' +
    errors.map((e) => e.message);
  for (const error of errors) {
    if (error.message.includes('Invalid_nonce')) {
      errorMessage = `  Failed to send transaction to the relayer. An invalid account nonce was specified. Please try again.`;
      break;
    }
  }
  return errorMessage;
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
