import chalk from 'chalk';
import enquirer from 'enquirer';
import fs from 'fs-extra';
import shell from 'shelljs';
import { getBorderCharacters, table } from 'table';
import util from 'util';
import Constants from './constants.js';
import step from './helpers.js';

const shellExec = util.promisify(shell.exec);
const lightnetConfigFile = `${Constants.lightnetWorkDir}/config.json`;
const lightnetLogsDir = `${Constants.lightnetWorkDir}/logs`;
const lightnetDockerContainerName = 'mina-local-lightnet';
const lightnetMinaDaemonGraphQlEndpoint = 'http://localhost:8080/graphql';
const lightnetAccountsManagerEndpoint = 'http://localhost:8181';
const lightnetArchiveNodeApiEndpoint = 'http://localhost:8282';

/**
 * Starts the lightweight Mina blockchain network Docker container.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {string}  argv.mode - The mode to start the lightnet in.
 * @param {string}  argv.type - The type of lightnet to start.
 * @param {string}  argv.proofLevel - The proof level to use.
 * @param {string}  argv.minaBranch - The Mina branch to use.
 * @param {boolean} argv.archive - Whether to start the Mina Archive process and the Archive-Node-API application.
 * @param {boolean} argv.sync - Whether to wait for the network to sync.
 * @param {boolean} argv.pull - Whether to pull the latest version of the Docker image from the Docker Hub.
 * @returns {Promise<void>}
 */
export async function startLightnet({
  mode,
  type,
  proofLevel,
  minaBranch,
  archive,
  sync,
  pull,
}) {
  let containerId = 'N/A';
  let containerVolume = 'N/A';
  await checkDockerCommandAvailability();
  await step('Checking prerequisites', async () => {
    await handleStartCommandChecks(lightnetDockerContainerName);
  });
  await step(
    pull
      ? 'Pulling the corresponding Docker image and cleaning up'
      : 'Cleaning up',
    async () => {
      await stopDockerContainer(lightnetDockerContainerName);
      await removeDockerContainer(lightnetDockerContainerName);
      if (pull) {
        await shellExec(
          `docker pull o1labs/mina-local-network:${minaBranch}-latest-${
            type === 'fast' ? 'lightnet' : 'devnet'
          }`,
          { silent: true }
        );
        await removeDanglingDockerImages();
      }
    }
  );
  await step(
    'Starting the lightweight Mina blockchain network Docker container',
    async () => {
      await shellExec(
        `docker run --name ${lightnetDockerContainerName} --pull=always -id ` +
          `--env NETWORK_TYPE="${mode}" ` +
          `--env PROOF_LEVEL="${proofLevel}" ` +
          `--env RUN_ARCHIVE_NODE="${archive}" ` +
          '-p 3085:3085 ' +
          '-p 4001:4001 ' +
          '-p 4006:4006 ' +
          '-p 5001:5001 ' +
          '-p 5432:5432 ' +
          '-p 6001:6001 ' +
          '-p 8080:8080 ' +
          '-p 8181:8181 ' +
          '-p 8282:8282 ' +
          `o1labs/mina-local-network:${minaBranch}-latest-${
            type === 'fast' ? 'lightnet' : 'devnet'
          }`,
        { silent: true }
      );
      containerId = getDockerContainerId(lightnetDockerContainerName);
      containerVolume = getDockerContainerVolume(lightnetDockerContainerName);
    }
  );
  await step('Preserving the network configuration', async () => {
    await fs.outputJson(
      lightnetConfigFile,
      {
        containerId,
        containerVolume,
        mode,
        type,
        proofLevel,
        minaBranch,
        archive,
        sync,
      },
      { spaces: 2, flag: 'w' }
    );
  });
  if (sync) {
    let runTime = null;
    await step('Waiting for the blockchain network readiness', async () => {
      const startTime = performance.now();
      await waitForBlockchainNetworkReadiness(mode);
      runTime = chalk.green.bold(
        secondsToHms(Math.round((performance.now() - startTime) / 1000))
      );
    });
    const statusColored = chalk.green.bold('is ready');
    console.info(`\nBlockchain network ${statusColored} in ${runTime}.`);
    await lightnetStatus();
  } else {
    const statusColored = chalk.green.bold('is running');
    console.info(
      `\nThe lightweight Mina blockchain network Docker container ${statusColored}.` +
        '\nPlease check the network readiness a bit later by executing:\n\n' +
        chalk.green.bold('zk lightnet status') +
        '\n'
    );
  }
}

/**
 * Stops the lightweight Mina blockchain network Docker container.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {string}  argv.saveLogs - Whether to save the Docker container processes logs to the host file system.
 * @param {string}  argv.cleanUp - Whether to perform the clean up.
 * @returns {Promise<void>}
 */
export async function stopLightnet({ saveLogs, cleanUp }) {
  let logsDir = null;
  await checkDockerCommandAvailability();
  await step('Checking prerequisites', async () => {
    await handleStopCommandChecks(lightnetDockerContainerName);
  });
  await step(
    'Stopping the lightweight Mina blockchain network Docker container',
    async () => {
      await stopDockerContainer(lightnetDockerContainerName);
    }
  );
  if (saveLogs && fs.existsSync(lightnetConfigFile)) {
    await step('Preserving Docker container processes logs', async () => {
      logsDir = await saveDockerContainerProcessesLogs();
    });
  }
  if (cleanUp) {
    await step('Cleaning up', async () => {
      await removeDockerContainer(lightnetDockerContainerName);
      await removeDanglingDockerImages();
      if (fs.existsSync(lightnetConfigFile)) {
        await removeDockerVolume(
          fs.readJSONSync(lightnetConfigFile).containerVolume
        );
      }
      await fs.remove(lightnetConfigFile);
    });
  }
  if (logsDir) {
    const boldLogs = chalk.reset.bold('logs');
    console.info(
      `\nThe Docker container processes ${boldLogs} can be found at:\n\n` +
        chalk.green.bold(logsDir) +
        '\n'
    );
    console.info('Done\n');
  } else {
    if (
      fs.existsSync(lightnetLogsDir) &&
      fs.readdirSync(lightnetLogsDir).length === 0
    ) {
      fs.removeSync(lightnetLogsDir);
    }
    console.info('\nDone\n');
  }
}

/**
 * Gets the lightweight Mina blockchain network status.
 * @param {boolean} object.checkCommandsAvailability - Whether to check different commands availability.
 * @returns {Promise<void>}
 */
export async function lightnetStatus({
  checkCommandsAvailability = false,
} = {}) {
  if (checkCommandsAvailability) {
    await checkDockerCommandAvailability();
  }
  const containerStatus = getDockerContainerStatus(lightnetDockerContainerName);
  if (containerStatus === 'not found') {
    console.log(
      chalk.red(
        '\nThe lightweight Mina blockchain network Docker container does not exist!'
      )
    );
    shell.exit(1);
  }
  console.log('\n' + chalk.reset.bold('Lightweight Mina Blockchain Network'));
  if (containerStatus === 'running' && fs.existsSync(lightnetConfigFile)) {
    printUsefulUrls();
    printDockerContainerProcessesLogPaths();
    await printBlockchainNetworkProperties();
    printZkAppSnippet();
    printExtendedDockerContainerState(lightnetDockerContainerName);
  } else {
    console.info(
      chalk.yellow.bold(
        '\nWarning:\nThe lightweight Mina blockchain network Docker container is either ' +
          '\nnot running or it was created outside of this application.' +
          '\nOnly limited information is available.'
      )
    );
    printExtendedDockerContainerState(lightnetDockerContainerName);
  }
}

async function checkDockerCommandAvailability() {
  await step('Checking Docker Engine availability', async () => {
    if (!shell.which('docker')) {
      console.info(
        '\n\nPlease ensure that Docker Engine is installed, then try again.' +
          '\nSee https://docs.docker.com/engine/install/ for more information.'
      );
      shell.exit(1);
    }
  });
}

async function handleStartCommandChecks(containerName) {
  if (
    getDockerContainerStatus(containerName) === 'running' &&
    fs.existsSync(lightnetConfigFile)
  ) {
    console.log(
      chalk.red(
        '\n\nThe lightweight Mina blockchain network is already running!'
      )
    );
    shell.exit(1);
  } else if (
    getDockerContainerStatus(containerName) !== 'not found' &&
    (!fs.existsSync(lightnetConfigFile) ||
      !dockerContainerIdMatchesConfig(containerName))
  ) {
    await handleDockerContainerPresence();
  }
}

async function handleStopCommandChecks(containerName) {
  if (
    getDockerContainerStatus(containerName) !== 'not found' &&
    (!fs.existsSync(lightnetConfigFile) ||
      !dockerContainerIdMatchesConfig(containerName))
  ) {
    await handleDockerContainerPresence();
  }
}

async function handleDockerContainerPresence() {
  const res = await enquirer.prompt({
    type: 'select',
    name: 'proceed',
    choices: ['Yes', 'No'],
    message: () => {
      return chalk.reset(
        'The lightweight Mina blockchain network Docker container already exists and it was created outside of this application.' +
          '\nDo you want to proceed anyway?'
      );
    },
    prefix: (state) => {
      // Shows a cyan question mark when not submitted.
      // Shows a green check mark if submitted.
      // Shows a red "x" if ctrl+C is pressed (default is a magenta).
      if (!state.submitted) return `\n${state.symbols.question}`;
      return !state.cancelled
        ? state.symbols.check
        : chalk.red(state.symbols.cross);
    },
  });
  if (res.proceed.trim().toLowerCase() === 'no') {
    shell.exit(0);
  }
}

function getDockerContainerStatus(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f '{{.State.Status}}' ${containerName}`,
    { silent: true }
  );
  return stdout.trim() === '' ? 'not found' : stdout.trim();
}

function getDockerContainerId(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f '{{.Id}}' ${containerName}`,
    { silent: true }
  );
  return stdout.trim();
}

function getDockerContainerVolume(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' ${containerName}`,
    { silent: true }
  );
  return stdout.trim();
}

function dockerContainerIdMatchesConfig(containerName) {
  const actualId = getDockerContainerId(containerName);
  const expectedId = fs.readJSONSync(lightnetConfigFile).containerId;
  return actualId === expectedId;
}

async function stopDockerContainer(containerName) {
  try {
    await shellExec(`docker stop ${containerName}`, { silent: true });
  } catch (_) {
    // Ignore the error if container doesn't exist
  }
}

async function removeDockerContainer(containerName) {
  try {
    await shellExec(`docker rm ${containerName}`, { silent: true });
  } catch (_) {
    // Ignore the error if container doesn't exist
  }
}

async function removeDockerVolume(volume) {
  try {
    await shellExec(`docker volume rm ${volume}`, { silent: true });
  } catch (_) {
    // Ignore the error if volume doesn't exist
  }
}

async function removeDanglingDockerImages() {
  await shellExec('docker image prune -f --filter "dangling=true"', {
    silent: true,
  });
}

async function saveDockerContainerProcessesLogs() {
  const timeZoneOffset = new Date().getTimezoneOffset() * 60000;
  const localMoment = new Date(Date.now() - timeZoneOffset);
  const logsDir = `${lightnetLogsDir}/${
    localMoment.toISOString().split('.')[0]
  }`;
  try {
    const lightnetConfig = fs.readJSONSync(lightnetConfigFile);
    const mode = lightnetConfig.mode;
    const archive = lightnetConfig.archive;
    await fs.ensureDir(logsDir);
    if (mode === 'single-node') {
      const logFilePaths = [
        'logs/archive-node-api.log',
        'logs/archive-node.log',
        'logs/single-node-network.log',
      ];
      for (const logFilePath of logFilePaths) {
        try {
          await shellExec(
            `docker cp ${lightnetDockerContainerName}:/root/${logFilePath} ${logsDir}/${logFilePath.replace(
              /\//g,
              '_'
            )}`,
            { silent: true }
          );
        } catch (_) {
          // Ignore the error if log file doesn't exist
        }
      }
    } else {
      const logFilePaths = [
        'archive/log.txt',
        'fish_0/log.txt',
        'node_0/log.txt',
        'seed/log.txt',
        'snark_coordinator/log.txt',
        'snark_workers/worker_0/log.txt',
        'whale_0/log.txt',
        'whale_1/log.txt',
      ];
      if (archive) {
        await shellExec(
          `docker cp ${lightnetDockerContainerName}:/root/logs/archive-node-api.log ${logsDir}`,
          { silent: true }
        );
      }
      for (const logFilePath of logFilePaths) {
        try {
          await shellExec(
            `docker cp ${lightnetDockerContainerName}:/root/.mina-network/mina-local-network-2-1-1/nodes/${logFilePath} ${logsDir}/${logFilePath.replace(
              /\//g,
              '_'
            )}`,
            { silent: true }
          );
        } catch (_) {
          // Ignore the error if log file doesn't exist
        }
      }
    }
    return logsDir;
  } catch (_) {
    fs.removeSync(logsDir);
    return null;
  }
}

async function waitForBlockchainNetworkReadiness(mode) {
  let blockchainSyncAttempt = 1;
  let blockchainIsReady = false;
  const maxAttempts = mode === 'single-node' ? 60 : 210;
  const pollingIntervalMs = 10_000;
  const syncStatusGraphQlQuery = {
    query: '{ syncStatus }',
    variables: null,
    operationName: null,
  };
  while (blockchainSyncAttempt <= maxAttempts && !blockchainIsReady) {
    try {
      const response = await fetch(lightnetMinaDaemonGraphQlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncStatusGraphQlQuery),
      });
      if (!response.ok) {
        await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
      } else {
        const responseJson = await response.json();
        if (!responseJson || !responseJson.data) {
          await new Promise((resolve) =>
            setTimeout(resolve, pollingIntervalMs)
          );
        } else if (responseJson.data.syncStatus === 'SYNCED') {
          blockchainIsReady = true;
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, pollingIntervalMs)
          );
        }
      }
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
    }
    blockchainSyncAttempt++;
  }
  if (!blockchainIsReady) {
    const statusColored = chalk.red.bold('is not ready');
    console.info(
      `\n\nMaximum attempts reached. The blockchain network ${statusColored}.` +
        '\nPlease consider to cleaning up the environment by executing:\n\n' +
        chalk.green.bold('zk lightnet stop') +
        '\n'
    );
    shell.exit(1);
  }
}

function printExtendedDockerContainerState(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f ` +
      `'Status: {{.State.Status}}; ` +
      `Is running: {{.State.Running}}; ` +
      `{{if .State.ExitCode}}Exit code: {{.State.ExitCode}}; {{end}}` +
      `Killed by OOM: {{.State.OOMKilled}}; ` +
      `{{if .State.Error}}Error: {{.State.Error}}{{end}}' ${containerName}`,
    { silent: true }
  );
  const boldTitle = chalk.reset.bold('\nDocker container state\n');
  console.info(boldTitle + stdout.trim());
}

function printUsefulUrls() {
  const lightnetConfig = fs.readJSONSync(lightnetConfigFile);
  const archive = lightnetConfig.archive;
  const border = getBorderCharacters('norc');
  const boldTitle = chalk.reset.bold('\nUseful URLs');
  const urls = [
    [
      chalk.bold('Mina Daemon GraphQL endpoint'),
      chalk.reset(lightnetMinaDaemonGraphQlEndpoint),
    ],
    [
      chalk.bold('Accounts Manager endpoint'),
      chalk.reset(lightnetAccountsManagerEndpoint),
    ],
  ];
  if (archive) {
    urls.push([
      chalk.bold('Archive-Node-API endpoint'),
      chalk.reset(lightnetArchiveNodeApiEndpoint),
    ]);
    urls.push([
      chalk.bold('PostgreSQL connection string'),
      chalk.reset('postgresql://postgres:postgres@localhost:5432/archive'),
    ]);
  }
  console.info(boldTitle);
  console.info(
    table(urls, {
      border,
    })
  );
}

function printDockerContainerProcessesLogPaths() {
  const lightnetConfig = fs.readJSONSync(lightnetConfigFile);
  const mode = lightnetConfig.mode;
  const border = getBorderCharacters('norc');
  const boldTitle = chalk.reset.bold(
    '\nLogs produced by different processes are redirected into the files' +
      '\nlocated by the following path patterns inside the container:'
  );
  const logs = [[chalk.reset('/root/logs/*.log')]];
  if (mode === 'multi-node') {
    logs.push([
      chalk.reset('/root/mina-local-network-2-1-1/nodes/**/logs/*.log'),
    ]);
  }
  console.info(boldTitle);
  console.info(
    table(logs, {
      border,
    })
  );
}

async function printBlockchainNetworkProperties() {
  const border = getBorderCharacters('norc');
  const boldTitle = chalk.reset.bold('\nBlockchain network properties');
  const noData = [
    [chalk.yellow('No data available yet. Please retry a bit later.')],
  ];
  let data = null;
  try {
    const graphQlQuery = {
      query: `{
        syncStatus
        daemonStatus {
          chainId
          consensusConfiguration {
            k
            slotDuration
            slotsPerEpoch
          }
          commitId
          uptimeSecs
          consensusMechanism
          snarkWorkFee
          numAccounts
        }
      }`,
      variables: null,
      operationName: null,
    };
    const response = await fetch(lightnetMinaDaemonGraphQlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphQlQuery),
    });
    if (!response.ok) {
      data = noData;
    } else {
      const responseJson = await response.json();
      if (!responseJson || !responseJson.data) {
        data = noData;
      } else {
        data = [
          [
            chalk.bold('Sync status'),
            chalk.reset(responseJson.data.syncStatus),
          ],
          [
            chalk.bold('Commit ID'),
            chalk.reset(responseJson.data.daemonStatus.commitId),
          ],
          [
            chalk.bold('Chain ID'),
            chalk.reset(responseJson.data.daemonStatus.chainId),
          ],
          [
            chalk.bold('Consensus mechanism'),
            chalk.reset(responseJson.data.daemonStatus.consensusMechanism),
          ],
          [
            chalk.bold('Consensus configuration'),
            chalk.reset(
              `Transaction finality ("k" blocks): ${responseJson.data.daemonStatus.consensusConfiguration.k}` +
                `\nSlot duration (new block every ~): ${
                  responseJson.data.daemonStatus.consensusConfiguration
                    .slotDuration / 1_000
                } seconds` +
                `\nSlots per Epoch: ${responseJson.data.daemonStatus.consensusConfiguration.slotsPerEpoch}`
            ),
          ],
          [
            chalk.bold('SNARK work fee'),
            chalk.reset(
              `${
                responseJson.data.daemonStatus.snarkWorkFee / 1_000_000_000
              } MINA`
            ),
          ],
          [
            chalk.bold('Known accounts'),
            chalk.reset(responseJson.data.daemonStatus.numAccounts),
          ],
          [
            chalk.bold('Uptime'),
            chalk.reset(
              secondsToHms(responseJson.data.daemonStatus.uptimeSecs)
            ),
          ],
        ];
      }
    }
  } catch (_) {
    data = noData;
  }
  console.info(boldTitle);
  console.info(
    table(data, {
      border,
    })
  );
}

function printZkAppSnippet() {
  const boldTitle = chalk.reset.bold('\nzkApp snippet using o1js API');
  console.info(boldTitle);
  console.info(
    chalk.dim(
      `import {
  Lightnet,
  Mina,
  ...
} from 'o1js';

// Network configuration
const network = Mina.Network({
  mina: '${lightnetMinaDaemonGraphQlEndpoint}',
  archive: '${lightnetArchiveNodeApiEndpoint}',
  lightnetAccountManager: '${lightnetAccountsManagerEndpoint}',
});
Mina.setActiveInstance(network);

// Fee payer setup
const feePayerPrivateKey = (await Lightnet.acquireKeyPair()).privateKey
const feePayerAccount = senderKey.toPublicKey();

...

// Release previously acquired key pair
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: feePayerAccount.toBase58(),
});
if (keyPairReleaseMessage) console.info(keyPairReleaseMessage);`
    )
  );
}

function secondsToHms(seconds) {
  seconds = Number(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor((seconds % 3600) % 60);

  const hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : '';
  const mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : '';
  const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : '';
  return hDisplay + mDisplay + sDisplay;
}
