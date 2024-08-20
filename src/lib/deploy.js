import chalk from 'chalk';
import enquirer from 'enquirer';
import glob from 'fast-glob';
import findPrefix from 'find-npm-prefix';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import path from 'node:path';
import util from 'node:util';
import { getBorderCharacters, table } from 'table';
import { dynamicImport } from './dynamic-import-helper.js';
import {
  findIfClassExtendsSmartContract,
  readDeployAliasesConfig,
  step,
} from './helpers.js';

// Module external API
export default deploy;

// Module internal API (exported for testing purposes)
export {
  chooseSmartContract,
  findSmartContracts,
  findZkProgramFile,
  generateVerificationKey,
  getAccountQuery,
  getContractName,
  getErrorMessage,
  getInstalledCliVersion,
  getLatestCliVersion,
  getTxnUrl,
  getZkProgram,
  getZkProgramNameArg,
  hasBreakingChanges,
  removeJsonQuotes,
  sendGraphQL,
  sendZkAppQuery,
};

const DEFAULT_NETWORK_ID = 'testnet';
const DEFAULT_GRAPHQL = 'https://proxy.devnet.minaexplorer.com/graphql'; // The endpoint used to interact with the network

/**
 * Deploy a smart contract to the specified deploy alias. If no deploy alias param is
 * provided, yargs will tell the user that the deploy alias param is required.
 * @param {string} alias   The deploy alias to deploy to.
 * @param {string} yes     Run non-interactively. I.e. skip confirmation steps.
 * @return {Promise<void>} Sends tx to a relayer, if confirmed by user.
 */
async function deploy({ alias, yes }) {
  // Get project root directory, so that the CLI command can be executed anywhere within the project.
  const projectRoot = await findPrefix(process.cwd());
  const config = readDeployAliasesConfig(projectRoot);
  const latestCliVersion = await getLatestCliVersion();
  const installedCliVersion = getInstalledCliVersion();

  if (!installedCliVersion) {
    console.log(
      chalk.red(
        `Failed to detect the installed zkapp-cli version. This might be possible if you are using Volta or something similar to manage your Node versions.`
      )
    );
    console.log(
      chalk.red(
        'As a workaround, you can install zkapp-cli as a local dependency by running `npm install zkapp-cli`'
      )
    );
    process.exit(1);
  }

  if (hasBreakingChanges(installedCliVersion, latestCliVersion)) {
    console.log(
      chalk.red(
        `You are using an earlier zkapp-cli version ${installedCliVersion}.`
      )
    );
    console.log(chalk.red(`The current version is ${latestCliVersion}.`));
    console.log(
      chalk.red('Run `npm update -g zkapp-cli && npm install o1js@latest`.')
    );
    process.exit(1);
  }

  if (!alias) {
    const aliases = Object.keys(config?.deployAliases);
    if (!aliases.length) {
      console.log(chalk.red('No deploy aliases found in config.json.'));
      console.log(
        chalk.red('Run `zk config` to add a deploy alias, then try again.')
      );
      process.exit(1);
    }

    /* istanbul ignore next */
    const deployAliasResponse = await enquirer.prompt({
      type: 'select',
      name: 'name',
      choices: aliases,
      message: (state) => {
        // Makes the step text green upon success, else uses reset.
        const style =
          state.submitted && !state.cancelled
            ? state.styles.success
            : chalk.reset;
        return style('Which deploy alias do you want to deploy to?');
      },
      prefix: (state) => {
        // Shows a cyan question mark when not submitted.
        // Shows a green check mark if submitted.
        // Shows a red "x" if ctrl+C is pressed (default is a magenta).
        if (!state.submitted) return state.symbols.question;
        return !state.cancelled
          ? state.symbols.check
          : chalk.red(state.symbols.cross);
      },
    });
    alias = deployAliasResponse.name;
  }

  alias = alias.toLowerCase();

  if (!config.deployAliases[alias]) {
    console.log(chalk.red('Deploy alias name not found in config.json.'));
    console.log(
      chalk.red('You can add a deploy alias by running `zk config`.')
    );
    process.exit(1);
  }

  if (!config.deployAliases[alias]?.url) {
    console.log(
      chalk.yellow(
        `No 'url' property is specified for this deploy alias in config.json.`
      )
    );
    console.log(
      chalk.yellow(`The default (${DEFAULT_GRAPHQL}) one will be used instead.`)
    );
  }

  await step('Build project', async () => {
    // store cache to add after build directory is emptied
    let cache;
    try {
      cache = fs.readJsonSync(`${projectRoot}/build/cache.json`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        cache = {};
      } else {
        console.error(err);
      }
    }

    fs.emptyDirSync(`${projectRoot}/build`); // ensure old artifacts don't remain
    fs.outputJsonSync(`${projectRoot}/build/cache.json`, cache, { spaces: 2 });

    execSync('npm run build --silent');
  });

  const build = await step('Generate build.json', async () => {
    // Identify all instances of SmartContract in the build.
    const smartContracts = await findSmartContracts(
      `${projectRoot}/build/**/*.js`
    );

    fs.outputJsonSync(
      `${projectRoot}/build/build.json`,
      { smartContracts },
      { spaces: 2 }
    );

    return { smartContracts };
  });

  const contractName = await getContractName(config, build, alias);

  // Set the default smartContract name for this deploy alias in config.json.
  // Occurs when this is the first time we're deploying to a given deploy alias.
  // Important to ensure the same smart contract will always be deployed to
  // the same deploy alias.
  if (config.deployAliases[alias]?.smartContract !== contractName) {
    config.deployAliases[alias].smartContract = contractName;
    fs.writeJSONSync(`${projectRoot}/config.json`, config, { spaces: 2 });
    console.log(
      `  Your config.json was updated to always use this\n  smart contract when deploying to this deploy alias.`
    );
  }

  // import o1js from the user directory
  let o1jsImportPath = `${projectRoot}/node_modules/o1js/dist/node/index.js`;

  if (process.platform === 'win32') {
    o1jsImportPath = 'file://' + o1jsImportPath;
  }
  let { PrivateKey, Mina, AccountUpdate } = await dynamicImport(o1jsImportPath);

  // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
  // This is to ensure the backward compatibility.
  const networkId =
    config.deployAliases[alias]?.networkId ?? DEFAULT_NETWORK_ID;
  const graphQlUrl = config.deployAliases[alias]?.url ?? DEFAULT_GRAPHQL;
  const Network = Mina.Network({
    networkId,
    mina: graphQlUrl,
  });
  Mina.setActiveInstance(Network);
  const { data: nodeStatus } = await sendGraphQL(
    graphQlUrl,
    `query {
      syncStatus
    }`
  );

  if (!nodeStatus || nodeStatus.syncStatus === 'OFFLINE') {
    console.log(
      chalk.red(
        `  Transaction relayer node is offline. Please try again or use a different "url" for this deploy alias in your config.json`
      )
    );
    process.exit(1);
  } else if (nodeStatus.syncStatus !== 'SYNCED') {
    console.log(
      chalk.red(
        `  Transaction relayer node is not in a synced state. Its status is "${nodeStatus.syncStatus}".\n  Please try again when the node is synced or use a different "url" for this deploy alias in your config.json`
      )
    );
    process.exit(1);
  }

  // Find the users file to import the smart contract from
  let smartContractImportPath = build.smartContracts.find(
    (contract) => contract.className === contractName
  ).filePath;
  if (process.platform === 'win32') {
    smartContractImportPath = 'file://' + smartContractImportPath;
  }
  // Attempt to import the smart contract class to deploy from the user's file.
  const smartContractImports = await dynamicImport(smartContractImportPath);

  // If we cannot find the named export log an error message and return early.
  if (smartContractImports && !(contractName in smartContractImports)) {
    console.log(
      chalk.red(
        `  Failed to find the "${contractName}" smart contract in your build directory.\n  Please confirm that your config.json contains the name of the smart \n  contract that you want to deploy using this deploy alias, check that\n  you have exported your smart contract class using a named export and try again.`
      )
    );

    process.exit(1);
  }

  // Attempt to import the zkApp private key from the `keys` directory and the feepayer private key. These keys will be used to deploy the zkApp.
  let feepayerPrivateKeyBase58;
  let zkAppPrivateKeyBase58;
  const { feepayerKeyPath } = config.deployAliases[alias];
  try {
    feepayerPrivateKeyBase58 = fs.readJsonSync(feepayerKeyPath).privateKey;
  } catch (error) {
    console.log(
      chalk.red(
        `  Failed to find the feepayer private key.\n  Please make sure your config.json has the correct 'feepayerKeyPath' property.`
      )
    );

    process.exit(1);
  }

  try {
    zkAppPrivateKeyBase58 = fs.readJsonSync(
      `${projectRoot}/${config.deployAliases[alias].keyPath}`
    ).privateKey;
  } catch (_) {
    console.log(
      chalk.red(
        `  Failed to find the zkApp private key.\n  Please make sure your config.json has the correct 'keyPath' property.`
      )
    );

    process.exit(1);
  }

  const zkApp = smartContractImports[contractName]; //  The specified zkApp class to deploy
  const zkAppPrivateKey = PrivateKey.fromBase58(zkAppPrivateKeyBase58); //  The private key of the zkApp
  const zkAppAddress = zkAppPrivateKey.toPublicKey(); //  The public key of the zkApp
  const feepayerPrivateKey = PrivateKey.fromBase58(feepayerPrivateKeyBase58); //  The private key of the feepayer
  const feepayerAddress = feepayerPrivateKey.toPublicKey(); //  The public key of the feepayer

  // guide user to choose a feepayer account that is different from the zkApp account
  if (feepayerAddress.toBase58() === zkAppAddress.toBase58()) {
    console.log(
      chalk.red(
        `  The feepayer account is the same as the zkApp account.\n  Please use a different feepayer account or generate a new one by executing the 'zk config' command.`
      )
    );
    process.exit(1);
  }

  // figure out if the zkApp has a @method init() - in that case we need to create a proof,
  // so we need to compile no matter what, and we show a separate step to create the proof
  let isInitMethod = zkApp._methods?.some((intf) => intf.methodName === 'init');

  const { verificationKey, isCached } = await step(
    'Generate verification key (takes 10-30 sec)',

    async () =>
      await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        isInitMethod
      )
  );

  // Can't include the log message inside the callback b/c it will break
  // the step formatting.
  if (isCached) {
    console.log('  Using the cached verification key');
  }

  let { fee } = config.deployAliases[alias];
  if (!fee) {
    console.log(
      chalk.red(
        `  The "fee" property is not specified for this deploy alias in config.json. Please update your config.json and try again.`
      )
    );

    process.exit(1);
  }
  fee = `${Number(fee) * 1e9}`; // in nanomina (1 billion = 1.0 mina)

  const feepayerAddressBase58 = feepayerAddress.toBase58();
  const accountQuery = getAccountQuery(feepayerAddressBase58);
  const accountResponse = await sendGraphQL(graphQlUrl, accountQuery);

  if (!accountResponse?.data?.account) {
    // No account is found, show an error message and return early
    console.log(
      chalk.red(
        `  Failed to find the fee payer's account on chain.\n  Please make sure the account "${feepayerAddressBase58}" has previously been funded.`
      )
    );
    process.exit(1);
  }

  let transaction = await step('Build transaction', async () => {
    let tx = await Mina.transaction(
      { sender: feepayerAddress, fee },
      /* istanbul ignore next */
      async () => {
        AccountUpdate.fundNewAccount(feepayerAddress);
        let zkapp = new zkApp(zkAppAddress);
        await zkapp.deploy({ verificationKey });
      }
    );
    return {
      tx,
      json: tx.sign([zkAppPrivateKey, feepayerPrivateKey]).toJSON(),
    };
  });

  if (isInitMethod) {
    transaction = await step(
      'Create transaction proof (takes 10-30 sec)',
      async () => {
        await transaction.tx.prove();
        return {
          tx: transaction.tx,
          json: transaction.tx
            .sign([zkAppPrivateKey, feepayerPrivateKey])
            .toJSON(),
        };
      }
    );
  }
  let transactionJson = transaction.json;
  let { feepayerAlias, url } = config.deployAliases[alias];
  const settings = [
    [chalk.bold('Deploy alias'), chalk.reset(alias)],
    [chalk.bold('Network kind'), chalk.reset(networkId)],
    [chalk.bold('URL'), chalk.reset(url)],
    [
      chalk.bold('Fee payer'),
      chalk.reset(
        `Alias         : ${feepayerAlias}\nAccount       : ${feepayerAddressBase58}`
      ),
    ],
    [
      chalk.bold('zkApp'),
      chalk.reset(
        `Smart contract: ${contractName}\nAccount       : ${zkAppAddress.toBase58()}`
      ),
    ],
    [chalk.bold('Transaction fee'), chalk.reset(`${Number(fee) / 1e9} Mina`)],
  ];

  let confirm;
  if (yes) {
    // Run non-interactively b/c user specified `--yes` or `-y`.
    confirm = 'yes';
  } else {
    // This is verbose, but creates ideal UX steps--expected colors & symbols.
    /* istanbul ignore next */
    let res = await enquirer.prompt({
      type: 'input',
      name: 'confirm',
      message: (state) => {
        // Makes the step text green upon success.
        const x = state.input.toLowerCase();
        const style =
          state.submitted && (x === 'yes' || x === 'y')
            ? state.styles.success
            : chalk.reset;

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
          : chalk.red(state.symbols.cross);
      },
      result: (val) => {
        // Using a text input b/c we want to require pressing "enter". But
        // we need to fail if any answer other than "yes" or "y" is given.
        val = val.toLowerCase();
        if (!(val === 'yes' || val === 'y')) {
          console.log(chalk.red('\n  Aborted. Transaction not sent.'));
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
    return await sendGraphQL(graphQlUrl, zkAppMutation);
  });

  if (!txn || txn?.kind === 'error') {
    console.log(chalk.red(getErrorMessage(txn)));
    process.exit(1);
  }

  const str =
    `\nSuccess! Deploy transaction sent.` +
    `\n` +
    `\nNext step:` +
    `\n  Your smart contract will be live (or updated)` +
    `\n  at ${zkAppAddress.toBase58()}` +
    `\n  as soon as the transaction is included in a block:` +
    `\n  ${getTxnUrl(graphQlUrl, txn)}`;

  console.log(chalk.green(str));
  process.exit(0);
}

async function getContractName(config, build, alias) {
  if (build.smartContracts.length === 0) {
    console.log(
      chalk.red(
        `\n  No smart contracts found in the project.\n  Please make sure you have at least one class that extends the o1js \`SmartContract\`.\n  Aborted.`
      )
    );
    process.exit(1);
  }
  // Identify which smart contract to be deployed for this deploy alias.
  let contractName = chooseSmartContract(config, build, alias);

  // If no smart contract is specified for this deploy alias in config.json &
  // 2+ smart contracts exist in build.json, ask which they want to use.
  if (!contractName) {
    /* istanbul ignore next */
    const contractNameResponse = await enquirer.prompt({
      type: 'select',
      name: 'contractName',
      choices: build.smartContracts.map((contract) => contract.className),
      message: (state) => {
        // Makes the step text green upon success, else uses reset.
        const style =
          state.submitted && !state.cancelled
            ? state.styles.success
            : chalk.reset;
        return style('Choose smart contract to deploy');
      },
      prefix: (state) => {
        // Shows a cyan question mark when not submitted.
        // Shows a green check mark if submitted.
        // Shows a red "x" if ctrl+C is pressed (default is a magenta).
        if (!state.submitted) return state.symbols.question;
        return !state.cancelled
          ? state.symbols.check
          : chalk.red(state.symbols.cross);
      },
    });
    contractName = contractNameResponse.contractName;
  } else {
    // Can't include the log message inside this callback b/c it will mess up
    // the step formatting.
    await step('Choose smart contract', async () => {});

    if (config.deployAliases[alias]?.smartContract) {
      console.log(
        `  The '${config.deployAliases[alias]?.smartContract}' smart contract will be used\n  for this deploy alias as specified in config.json.`
      );
    } else {
      console.log(
        `  Only one smart contract exists in the project: ${build.smartContracts[0].className}`
      );
    }
  }
  return contractName;
}

async function generateVerificationKey(
  projectRoot,
  contractName,
  zkApp,
  zkAppAddress,
  isInitMethod
) {
  let cache = fs.readJsonSync(`${projectRoot}/build/cache.json`);
  // compute a hash of the contract's circuit to determine if 'zkapp.compile' should re-run or cached verfification key can be used
  let currentDigest = await zkApp.digest(zkAppAddress);

  // initialize cache if 'zk deploy' is run the first time on the contract
  cache[contractName] = cache[contractName] ?? {};

  let zkProgram, currentZkProgramDigest, zkProgramNameArg;

  // if zk program name is in the cache, import it to compute the digest to determine if it has changed
  if (cache[contractName]?.zkProgram) {
    zkProgramNameArg = cache[contractName]?.zkProgram;
    zkProgram = await getZkProgram(projectRoot, zkProgramNameArg);
    currentZkProgramDigest = await zkProgram.digest();
  }

  // If smart contract doesn't change and there is no zkprogram return contract cached vk
  if (!isInitMethod && cache[contractName]?.digest === currentDigest) {
    let isCached = true;

    if (
      cache[contractName]?.zkProgram &&
      currentZkProgramDigest !== cache[zkProgramNameArg]?.digest
    ) {
      const zkProgramDigest = await zkProgram.digest();
      await zkProgram.compile();

      // update cache with zkprogram digest.
      cache[zkProgramNameArg].digest = zkProgramDigest;

      fs.writeJSONSync(`${projectRoot}/build/cache.json`, cache, {
        spaces: 2,
      });
      isCached = false;
    }
    // return vk and isCached flag if only a smart contract that is unchanged or both zkprogram and smart contract unchanged
    return {
      verificationKey: cache[contractName].verificationKey,
      isCached,
    };
  } else {
    // case when deploy is run for the first time or smart contract has changed or has an init method
    let verificationKey;
    try {
      // attempt to compile the zkApp
      const result = await zkApp.compile(zkAppAddress);

      verificationKey = result.verificationKey;
    } catch (error) {
      // if the zkApp compilation fails because the ZkProgram compilation output that the smart contract verifies is not found,
      // the error message is parsed to get the ZkProgram name argument.
      if (error.message.includes(`but we cannot find compilation output for`)) {
        zkProgramNameArg = getZkProgramNameArg(error.message);
      } else {
        console.error(error);
        process.exit(1);
      }
    }
    // import and compile ZkProgram if smart contract to deploy verifies it
    if (zkProgramNameArg) {
      zkProgram = await getZkProgram(projectRoot, zkProgramNameArg);
      const currentZkProgramDigest = await zkProgram.digest();
      await zkProgram.compile();

      const result = await zkApp.compile(zkAppAddress);
      verificationKey = result.verificationKey;

      // Add ZkProgram name to cache of the smart contract that verifies it
      cache[contractName].zkProgram = zkProgramNameArg;
      // Initialize zkprogram cache if not defined
      cache[zkProgramNameArg] = cache[zkProgramNameArg] ?? {};
      cache[zkProgramNameArg].digest = currentZkProgramDigest;
    }

    // update cache with new smart contract verification key and currrentDigest
    cache[contractName].verificationKey = verificationKey;
    cache[contractName].digest = currentDigest;

    fs.writeJSONSync(`${projectRoot}/build/cache.json`, cache, {
      spaces: 2,
    });

    return { verificationKey, isCached: false };
  }
}

/**
 * Get the specified blockchain explorer url with txn hash
 */
function getTxnUrl(graphQlUrl, txn) {
  const hostName = new URL(graphQlUrl).hostname;
  const txnBroadcastServiceName = hostName
    .split('.')
    .filter((item) => item === 'minascan')?.[0];
  const networkName = graphQlUrl
    .split('/')
    .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txn.data.sendZkapp.zkapp.hash}?type=zk-tx`;
  }
  return `Transaction hash: ${txn.data.sendZkapp.zkapp.hash}`;
}

/**
 * Query npm registry to get the latest CLI version.
 */
async function getLatestCliVersion() {
  return await fetch('https://registry.npmjs.org/-/package/zkapp-cli/dist-tags')
    .then((response) => response.json())
    .then((response) => response['latest']);
}

function getInstalledCliVersion() {
  const localInstalledPkgs = execSync('npm list --depth 0 --json --silent', {
    encoding: 'utf-8',
  });

  const localCli =
    JSON.parse(localInstalledPkgs)?.['dependencies']?.['zkapp-cli']?.[
      'version'
    ];

  // Fetch the globally installed version of the zkApp cli if no local version is found
  if (!localCli) {
    const globalInstalledPkgs = execSync(
      'npm list -g --depth 0 --json --silent',
      {
        encoding: 'utf-8',
      }
    );

    return JSON.parse(globalInstalledPkgs)?.['dependencies']?.['zkapp-cli']?.[
      'version'
    ];
  }

  return localCli;
}

/**
 * While o1js and the zkApp CLI have a major version of 0,
 * a change of the minor version represents a breaking change.
 * When o1js and the zkApp CLI have a major version of 1 or higher,
 * changes to the major version of the zkApp CLI will represent
 * breaking changes, following semver.
 */
function hasBreakingChanges(installedVersion, latestVersion) {
  const installedVersionArr = installedVersion
    ?.split('.')
    .map((version) => Number(version));

  const latestVersionArr = latestVersion
    ?.split('.')
    .map((version) => Number(version));

  if (installedVersionArr[0] === 0) {
    return installedVersionArr[1] < latestVersionArr[1];
  }

  return installedVersionArr[0] < latestVersionArr[0];
}

/**
 * Find the user-specified class names for every instance of `SmartContract`
 * in the build dir.
 * @param {string} path The glob pattern--e.g. `build/**\/*.js`
 * @returns {Promise<array>} The user-specified names of the classes that extend or implement o1js `SmartContract`, e.g. ['Foo', 'Bar']
 */
async function findSmartContracts(path) {
  if (process.platform === 'win32') {
    path = path.replaceAll('\\', '/');
  }
  const files = await glob(path);
  const smartContracts = [];

  for (const file of files) {
    const result = findIfClassExtendsSmartContract(file);
    if (result && result.length > 0) {
      smartContracts.push(...result);
    }
  }

  return smartContracts;
}

/**
 * Choose which smart contract to deploy for this deploy alias.
 * @param {object} config  The config.json in object format.
 * @param {object} deploy  The build/build.json in object format.
 * @param {string} deployAliasName The deploy alias name.
 * @returns {string} The smart contract name.
 */
function chooseSmartContract(config, deploy, deployAliasName) {
  // If the deploy alias in config.json has a smartContract specified, use it.
  if (config.deployAliases[deployAliasName]?.smartContract) {
    return config.deployAliases[deployAliasName]?.smartContract;
  }

  // If only one smart contract exists in the build, use it.
  if (deploy.smartContracts.length === 1) {
    return deploy.smartContracts[0].className;
  }

  // If 2+ smartContract classes exist in build.json, return falsy.
  // We'll need to ask the user which they want to use for this deploy alias.
  return '';
}

/**
 * Finds the the user defined name argument of the ZkProgram that is verified in a smart contract
 * https://github.com/o1-labs/o1js/blob/7f1745a48567bdd824d4ca08c483b4f91e0e3786/src/examples/zkprogram/program.ts#L16.
 */
function getZkProgramNameArg(message) {
  let zkProgramNameArg = null;

  // Regex to parse the ZkProgram name argment that is specified in the given message
  const regex =
    /depends on ([\w-]+), but we cannot find compilation output for ([\w-]+)/;
  const match = message.match(regex);
  if (match && match[1] === match[2]) {
    zkProgramNameArg = match[1];
    return zkProgramNameArg;
  }
  return zkProgramNameArg;
}

/**
 * Find the file and variable name of the ZkProgram.
 * @param {string}    buildPath    The glob pattern--e.g. `build/**\/*.js`
 * @param {string}    zkProgramNameArg The user-specified ZkProgram name argument https://github.com/o1-labs/o1js/blob/7f1745a48567bdd824d4ca08c483b4f91e0e3786/src/examples/zkprogram/program.ts#L16.
 * @returns {Promise<{zkProgramVarName: string, zkProgramFile: string}>}
 *      An object containing the variable name (`zkProgramVarName`)
 *      of the ZkProgram and the file name (`zkProgramFile`) in which the specified ZkProgram is found.
 *      Returns null if the ZkProgram is not found.
 */
async function findZkProgramFile(buildPath, zkProgramNameArg) {
  if (process.platform === 'win32') {
    buildPath = buildPath.replaceAll('\\', '/');
  }
  const files = await glob(buildPath);

  for (const file of files) {
    const zkProgram = fs.readFileSync(file, 'utf-8');

    // Regex is used to find and extract the variable name of the ZkProgram
    // that has a matching name argument that is verified in the smart contract
    // to be deployed.
    const regex =
      /(\w+)\s*=\s*ZkProgram\(\{[\s\S]*?name:\s*['"]([\w-]+)['"][\s\S]*?\}\);/g;

    let match;

    while ((match = regex.exec(zkProgram)) !== null) {
      // eslint-disable-next-line no-unused-vars
      const [_, zkProgramVarName, nameArg] = match;

      const buildSrcPath = buildPath.replace('**/*.js', 'src');
      const relativePath = path.relative(buildSrcPath, file);

      const isNested =
        !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

      const zkProgramFile = isNested ? relativePath : path.basename(file);

      if (nameArg === zkProgramNameArg) {
        return {
          zkProgramVarName,
          zkProgramFile,
        };
      }
    }
  }
}

/**
 * Find and import the ZkProgram.
 * @param {string}    projectRoot    The root directory path of the smart contract
 * @param {string}    zkProgramNameArg The user-specified ZkProgram name argument https://github.com/o1-labs/o1js/blob/7f1745a48567bdd824d4ca08c483b4f91e0e3786/src/examples/zkprogram/program.ts#L16.
 * @returns {Promise<object>}   The ZkProgram.
 */
async function getZkProgram(projectRoot, zkProgramNameArg) {
  let { zkProgramFile, zkProgramVarName } = await findZkProgramFile(
    `${projectRoot}/build/**/*.js`,
    zkProgramNameArg
  );

  const zkProgramImportPath =
    process.platform === 'win32'
      ? `file://${projectRoot}/build/src/${zkProgramFile}`
      : `${projectRoot}/build/src/${zkProgramFile}`;

  const zkProgramImports = await dynamicImport(zkProgramImportPath);
  const zkProgram = zkProgramImports[zkProgramVarName];

  return zkProgram;
}

async function sendGraphQL(graphQLUrl, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 20000); // Default to use 20s as a timeout
  let response;
  try {
    let body = JSON.stringify({ operationName: null, query, variables: {} });
    response = await fetch(graphQLUrl, {
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

function sendZkAppQuery(accountUpdatesJson) {
  return `
  mutation {
    sendZkapp(input: {
      zkappCommand: ${removeJsonQuotes(accountUpdatesJson)}
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
