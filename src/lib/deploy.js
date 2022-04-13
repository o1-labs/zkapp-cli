const sh = require('child_process').execSync;
const fs = require('fs-extra');
const path = require('path');
const findPrefix = require('find-npm-prefix');
const { prompt } = require('enquirer');
const { table, getBorderCharacters } = require('table');
const glob = require('fast-glob');
const { step } = require('./helpers');
// const graphql = require('graphql.js');

const { red, green, bold, reset } = require('chalk');
const log = console.log;

const GraphQLEndpoint = 'https://proxy.berkeley.minaexplorer.com/graphql';

/**
 * Deploy a smart contract to the specified network. If no network param is
 * provided, yargs will tell the user that the network param is required.
 * @param {string} network Network name to deploy to.
 * @param {string} yes     Run non-interactively. I.e. skip confirmation steps.
 * @return {void}          Sends tx to a relayer, if confirmed by user.
 */
async function deploy({ network, yes }) {
  const { PrivateKey, compile, deploy, getAccount, isReady, shutdown } =
    await import('snarkyjs');
  const Client = (await import('mina-signer')).default;
  await isReady;

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

  const buildFile = await exportSmartContract(
    `${DIR}/build/**/*.js`,
    contractName
  );

  let smartContractClass = await import(`${DIR}/build/src/${buildFile}`);
  let zkApp = smartContractClass.default;

  // TODO: Do we save the zkappKey anywhere?
  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  let verificationKey = await step('Generate verification key', async () => {
    let { verificationKey } = await compile(zkApp, zkappAddress);
    return verificationKey;
  });

  let partiesJsonDeploy = await step('Build transaction', async () => {
    return await deploy(zkApp, {
      zkappKey,
      verificationKey,
    });
  });

  let signedPayment = await step('Sign transaction', async () => {
    const { privateKey } = fs.readJSONSync(`${DIR}/keys/${network}.json`);
    const accountData = await getAccount(
      GraphQLEndpoint,
      'B62qmQDtbNTymWXdZAcp4JHjfhmWmuqHjwc6BamUEvD8KhFpMui2K1Z' // TODO: Repalce this later. Currently using to get a dummy nonce from the network.
    );

    let client = new Client({ network: 'testnet' });
    let feePayerDeploy = {
      feePayer: client.derivePublicKey(privateKey),
      fee: `${1_000_000_000}`, // TODO: Make fee configurable. Should we just make a step for the user to specify?
      nonce: accountData?.data?.account?.nonce ?? 0,
    };
    return client.signTransaction(
      { parties: JSON.parse(partiesJsonDeploy), feePayer: feePayerDeploy },
      privateKey
    );
  });

  log(signedPayment);

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
  await shutdown();
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

/**
 * Find and copy the specified SmartContract class to be deployed
 * into a temporary file. Adds a `default export` statement to the
 * specified class so it can then be imported to compile and deploy.
 * @param {string} buildPath The glob pattern--e.g. `build/**\/*.js`
 * @param {string} contractName The contract to deploy
 * @returns {string} Name of the newly built file
 */
async function exportSmartContract(buildPath, contractName) {
  const files = await glob(buildPath);
  for (const file of files) {
    const contract = fs.readFileSync(file, 'utf-8');

    let exportedContract = await addDefaultExportToContract(
      contractName,
      contract
    );

    const buildDir = path.dirname(file);
    const buildFile = `build.${path.basename(file)}`;
    // Write to a temporary file in the build directory. We use a temporary
    // file so we can later file when we attempt to deploy it to the network
    // without making unexpected changes to the original file.
    fs.writeFileSync(path.join(buildDir, buildFile), exportedContract, 'utf8');
    return buildFile;
  }
}

async function addDefaultExportToContract(contractName, contractFileData) {
  let exportStatement = await getExportStatementFromContract(
    contractName,
    contractFileData
  );
  if (exportStatement) {
    // Replace any existing export statement with `export default`
    return contractFileData.replace(
      new RegExp(
        `${exportStatement}class ${contractName} extends SmartContract`,
        'gi'
      ),
      `\nexport default class ${contractName} extends SmartContract`
    );
  } else {
    // If there is no export statement, add an `export default` to the class
    return contractFileData.replace(
      new RegExp(`class ${contractName} extends SmartContract`, 'gi'),
      `export default class ${contractName} extends SmartContract`
    );
  }
}

async function getExportStatementFromContract(contractName, contractFileData) {
  // Find the SmartContract class that is specified to be deployed
  let results = contractFileData.matchAll(
    new RegExp(
      `(\\w*\\s*\\w*\\s?)class ${contractName} extends SmartContract`,
      'gi'
    )
  );
  results = Array.from(results) ?? [];
  results = results.flat();
  return results.length >= 2 ? results[1] : undefined;
}

module.exports = {
  deploy,
  findSmartContracts,
  chooseSmartContract,
  addDefaultExportToContract,
  getExportStatementFromContract,
};
