import chalk from 'chalk';
import decompress from 'decompress';
import enquirer from 'enquirer';
import fs from 'fs-extra';
import opener from 'opener';
import path from 'path';
import shell from 'shelljs';
import { getBorderCharacters, table } from 'table';
import util from 'util';
import Constants from './constants.js';
import step from './helpers.js';

const shellExec = util.promisify(shell.exec);
const lightnetConfigFile = path.resolve(
  `${Constants.lightnetWorkDir}/config.json`
);
const lightnetLogsDir = path.resolve(`${Constants.lightnetWorkDir}/logs`);
const lightnetExplorerDir = path.resolve(
  `${Constants.lightnetWorkDir}/explorer`
);
const lightnetExplorerConfigFile = path.resolve(
  `${lightnetExplorerDir}/config.json`
);
const lightnetDockerContainerName = 'mina-local-lightnet';
const lightnetMinaDaemonGraphQlEndpoint = 'http://localhost:8080/graphql';
const lightnetAccountsManagerEndpoint = 'http://localhost:8181';
const lightnetArchiveNodeApiEndpoint = 'http://localhost:8282';
const archiveNodeApiProcessName = 'Archive-Node-API application';
const minaArchiveProcessName = 'Mina Archive process';
const multiPurposeMinaDaemonProcessName = 'Mina multi-purpose Daemon';
const DockerContainerState = {
  RUNNING: 'running',
  NOT_FOUND: 'not-found',
};
const ContainerLogFilesPrefix = {
  SINGLE_NODE: '/root',
  MULTI_NODE: '/root/.mina-network/mina-local-network-2-1-1/nodes',
};
let isDebug = false;
let quotes = "'";
let escapeQuotes = '';
if (process.platform === 'win32') {
  quotes = '"';
  const { code } = shell.exec('Get-ChildItem', { silent: true });
  if (code == 0) {
    escapeQuotes = '\\`';
  } else {
    escapeQuotes = '\\"';
  }
}

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
 * @param {string}  argv.minaLogLevel - Mina processes logging level to use.
 * @param {boolean} argv.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetStart({
  mode,
  type,
  proofLevel,
  minaBranch,
  archive,
  sync,
  pull,
  minaLogLevel,
  debug,
}) {
  isDebug = debug;
  let containerId = null;
  let containerVolume = null;
  await checkDockerEngineAvailability();
  await step('Checking prerequisites', async () => {
    await handleStartCommandChecks(lightnetDockerContainerName);
  });
  await step(
    'Stopping and removing the existing Docker container',
    async () => {
      await stopDockerContainer(lightnetDockerContainerName);
      await removeDockerContainer(lightnetDockerContainerName);
    }
  );
  if (pull) {
    await step('Pulling the corresponding Docker image', async () => {
      await shellExec(
        `docker pull o1labs/mina-local-network:${minaBranch}-latest-${
          type === 'fast' ? 'lightnet' : 'devnet'
        }`,
        { silent: !isDebug }
      );
      await removeDanglingDockerImages();
    });
  }
  await step(
    'Starting the lightweight Mina blockchain network Docker container',
    async () => {
      await shellExec(
        `docker run --name ${lightnetDockerContainerName} --pull=missing -id ` +
          `--env NETWORK_TYPE="${mode}" ` +
          `--env PROOF_LEVEL="${proofLevel}" ` +
          `--env LOG_LEVEL="${minaLogLevel}" ` +
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
        { silent: !isDebug }
      );
      containerId = getDockerContainerId(lightnetDockerContainerName);
      containerVolume = getDockerContainerVolume(lightnetDockerContainerName);
    }
  );
  await step('Preserving the network configuration', async () => {
    fs.outputJsonSync(
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
    console.log(`\nBlockchain network ${statusColored} in ${runTime}.`);
    await lightnetStatus({ preventDockerEngineAvailabilityCheck: true, debug });
  } else {
    const statusColored = chalk.green.bold('is running');
    console.log(
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
 * @param {boolean} argv.saveLogs - Whether to save the Docker container processes logs to the host file system.
 * @param {boolean} argv.cleanUp - Whether to perform the clean up.
 * @param {boolean} argv.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetStop({ saveLogs, cleanUp, debug }) {
  isDebug = debug;
  let logsDir = null;
  await checkDockerEngineAvailability();
  await step('Checking prerequisites', async () => {
    await handleStopCommandChecks(lightnetDockerContainerName);
  });
  await step(
    'Stopping the lightweight Mina blockchain network Docker container',
    async () => {
      await stopDockerContainer(lightnetDockerContainerName);
    }
  );
  if (
    saveLogs &&
    fs.existsSync(lightnetConfigFile) &&
    DockerContainerState.NOT_FOUND !==
      getDockerContainerState(lightnetDockerContainerName)
  ) {
    await step('Preserving the Docker container processes logs', async () => {
      logsDir = await saveDockerContainerProcessesLogs();
    });
  }
  if (cleanUp) {
    await step(
      'Cleaning up' +
        '\n  - Docker container' +
        '\n  - Dangling Docker images' +
        '\n  - Docker volume' +
        '\n  - Blockchain network configuration',
      async () => {
        await removeDockerContainer(lightnetDockerContainerName);
        await removeDanglingDockerImages();
        if (fs.existsSync(lightnetConfigFile)) {
          await removeDockerVolume(
            fs.readJSONSync(lightnetConfigFile).containerVolume
          );
        }
        await fs.remove(lightnetConfigFile);
      }
    );
  }
  if (logsDir) {
    const boldLogs = chalk.reset.bold('logs');
    console.log(
      `\nThe Docker container processes ${boldLogs} can be found at the following path:\n\n` +
        chalk.green.bold(logsDir) +
        '\n'
    );
    console.log('Done\n');
  } else {
    if (
      fs.existsSync(lightnetLogsDir) &&
      fs.readdirSync(lightnetLogsDir).length === 0
    ) {
      fs.removeSync(lightnetLogsDir);
    }
    console.log('\nDone\n');
  }
}

/**
 * Gets the lightweight Mina blockchain network status.
 * @param {boolean} object.preventDockerEngineAvailabilityCheck - Whether to prevent the Docker Engine availability check.
 * @param {boolean} object.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetStatus({
  preventDockerEngineAvailabilityCheck = false,
  debug,
} = {}) {
  isDebug = debug;
  if (!preventDockerEngineAvailabilityCheck) {
    await checkDockerEngineAvailability();
  }
  const containerState = getDockerContainerState(lightnetDockerContainerName);
  if (DockerContainerState.NOT_FOUND === containerState) {
    console.log(
      chalk.red(
        '\nThe lightweight Mina blockchain network Docker container does not exist!'
      )
    );
    shell.exit(1);
  }
  console.log('\n' + chalk.reset.bold('Lightweight Mina Blockchain Network'));
  if (
    DockerContainerState.RUNNING === containerState &&
    fs.existsSync(lightnetConfigFile)
  ) {
    printUsefulUrls();
    printDockerContainerProcessesLogPaths();
    await printBlockchainNetworkProperties();
    printZkAppSnippet();
    printExtendedDockerContainerState(lightnetDockerContainerName);
  } else {
    console.log(
      chalk.yellow.bold(
        '\nWarning:\nThe lightweight Mina blockchain network Docker container is either ' +
          '\nnot running or it was created outside of this application.' +
          '\nOnly limited information is available.'
      )
    );
    printExtendedDockerContainerState(lightnetDockerContainerName);
  }
}

/**
 * Saves the lightweight Mina blockchain network Docker container processes logs to the host file system.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {boolean} argv.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetSaveLogs({ debug }) {
  isDebug = debug;
  let logsDir = null;
  await checkDockerEngineAvailability();
  if (
    fs.existsSync(lightnetConfigFile) &&
    DockerContainerState.NOT_FOUND !==
      getDockerContainerState(lightnetDockerContainerName)
  ) {
    await step('Preserving the Docker container processes logs', async () => {
      logsDir = await saveDockerContainerProcessesLogs();
    });
    if (logsDir) {
      const boldLogs = chalk.reset.bold('logs');
      console.log(
        `\nThe Docker container processes ${boldLogs} were preserved at the following path:\n\n` +
          chalk.green.bold(logsDir) +
          '\n'
      );
    } else {
      console.log(
        chalk.red(
          '\nIssue happened during the Docker container processes logs preservation!'
        )
      );
      shell.exit(1);
    }
  } else {
    console.log(
      chalk.red(
        '\nIt is impossible to preserve the logs at the moment!' +
          '\nPlease ensure that the lightweight Mina blockchain network Docker container exists, then try again.'
      )
    );
    shell.exit(1);
  }
}

/**
 * Follows one of the lightweight Mina blockchain network Docker container processes logs.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {string}  argv.process - The name of the Docker container process to follow the logs of.
 * @param {boolean} argv.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetFollowLogs({ process, debug }) {
  isDebug = debug;
  await checkDockerEngineAvailability();
  const isDockerContainerRunning =
    fs.existsSync(lightnetConfigFile) &&
    DockerContainerState.RUNNING ===
      getDockerContainerState(lightnetDockerContainerName);
  if (!isDockerContainerRunning) {
    console.log(
      chalk.red(
        '\nIt is impossible to follow the logs at the moment!' +
          '\nPlease ensure that the lightweight Mina blockchain network Docker container is up and running, then try again.'
      )
    );
    shell.exit(1);
  }
  const lightnetConfig = fs.readJSONSync(lightnetConfigFile);
  const processToLogFileMapping = getProcessToLogFileMapping(lightnetConfig);
  const selectedProcess =
    process || (await promptForDockerContainerProcess(processToLogFileMapping));
  const logFilePath = processToLogFileMapping.get(selectedProcess);

  await step('Docker container file content streaming', async () => {
    await streamDockerContainerFileContent(
      lightnetDockerContainerName,
      logFilePath
    );
  });
}

/**
 * Launches the lightweight Mina Explorer.
 * @param {object}  argv - The arguments object provided by yargs.
 * @param {string}  argv.use - The version of the lightweight Mina Explorer to use.
 * @param {boolean} argv.list - Whether to list the available versions of the lightweight Mina Explorer.
 * @param {boolean} argv.debug - Whether to print the debug information.
 * @returns {Promise<void>}
 */
export async function lightnetExplorer({ use, list, debug }) {
  isDebug = debug;
  if (list) {
    await printExplorerVersions();
  } else {
    await launchExplorer(use);
  }
}

async function printExplorerVersions() {
  try {
    const releasesPrintLimit = 5;
    const border = getBorderCharacters('norc');
    const boldTitle = chalk.reset.bold('Lightweight Mina Explorer versions');
    const versions = [
      [boldTitle, '', ''],
      ['Version', 'Published on', 'Is in use?'],
    ];
    const releases = await fetchExplorerReleases();
    const currentVersion = getCurrentExplorerVersion();
    if (releases.length === 0) {
      versions.push([
        chalk.yellow('No data available yet.\nPlease try again later.'),
        '',
        '',
      ]);
      console.log(
        '\n' +
          table(versions, {
            border,
            spanningCells: [
              { col: 0, row: 0, colSpan: 3, alignment: 'center' },
              { col: 0, row: 2, colSpan: 3, alignment: 'center' },
            ],
          })
      );
      return;
    }
    for (const release of releases.slice(0, releasesPrintLimit)) {
      versions.push([
        chalk.reset.bold(release.name),
        new Date(release.published_at).toLocaleString(),
        currentVersion === release.name ? chalk.reset.green.bold('✓ Yes') : '',
      ]);
    }
    console.log(
      '\n' +
        table(versions, {
          border,
          spanningCells: [{ col: 0, row: 0, colSpan: 3, alignment: 'center' }],
        })
    );
    if (releases.length > releasesPrintLimit) {
      console.log(
        `Only ${chalk.green.bold(
          releasesPrintLimit
        )} most recent versions are shown.` +
          '\nPlease refer to the GitHub repository for the full list of available versions:' +
          chalk.green(
            '\nhttps://github.com/o1-labs/mina-lightweight-explorer/releases'
          )
      );
    }
  } catch (error) {
    printErrorIfDebug(error);
    console.log(
      chalk.red(
        '\nIssue happened while fetching the lightweight Mina Explorer available versions!'
      )
    );
    shell.exit(1);
  }
}

async function launchExplorer(use) {
  try {
    const releases = await fetchExplorerReleases();
    if (releases.length === 0) {
      console.log(
        chalk.red(
          '\nNo lightweight Mina Explorer versions are available yet.\nPlease try again later.'
        )
      );
      shell.exit(1);
    }
    const useVersion = use === 'latest' ? releases[0].name : use;
    const release = releases.find((release) => release.name === useVersion);
    const explorerReleasePath = path.resolve(
      `${lightnetExplorerDir}/${useVersion}`
    );
    const explorerReleaseIndexFilePath = path.resolve(
      `${explorerReleasePath}/index.html`
    );
    if (!release) {
      console.log(
        chalk.red(
          `\nThe specified version ("${useVersion}") of the lightweight Mina Explorer does not exist!`
        )
      );
      shell.exit(1);
    }
    await handleExplorerReleasePresence(explorerReleasePath, release);
    await updateCurrentExplorerVersion(useVersion);
    await step('Launching the lightweight Mina Explorer', async () => {
      opener(`file://${explorerReleaseIndexFilePath}`);
    });
    console.log(
      chalk.reset(
        '\nThe lightweight Mina Explorer is available at the following path:' +
          '\n\n' +
          chalk.green.bold(explorerReleaseIndexFilePath) +
          '\n'
      )
    );
  } catch (error) {
    printErrorIfDebug(error);
    console.log(
      chalk.red(
        '\nIssue happened while launching the lightweight Mina Explorer!'
      )
    );
    shell.exit(1);
  }
}

function getCurrentExplorerVersion() {
  if (fs.existsSync(lightnetExplorerConfigFile)) {
    return fs.readJSONSync(lightnetExplorerConfigFile).version;
  }
  return null;
}

async function updateCurrentExplorerVersion(version) {
  const currentVersion = getCurrentExplorerVersion();
  if (currentVersion !== version) {
    await step(
      'Updating the current lightweight Mina Explorer version in use',
      async () => {
        let explorerConfig = { version };
        if (fs.existsSync(lightnetExplorerConfigFile)) {
          explorerConfig = fs.readJSONSync(lightnetExplorerConfigFile);
          explorerConfig.version = version;
        }
        fs.ensureDirSync(lightnetExplorerDir);
        fs.outputJsonSync(lightnetExplorerConfigFile, explorerConfig, {
          spaces: 2,
          flag: 'w',
        });
      }
    );
  }
}

async function fetchExplorerReleases() {
  let releases = [];
  await step(
    'Fetching the lightweight Mina Explorer releases information',
    async () => {
      const response = await fetch(
        'https://api.github.com/repos/o1-labs/mina-lightweight-explorer/releases',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Received ${response.status} status code from the GitHub API.`
        );
      }
      releases = await response.json();
    }
  );
  return releases;
}

async function downloadExplorerRelease(release) {
  await step(
    'Downloading the lightweight Mina Explorer release bundle',
    async () => {
      const response = await fetch(release.zipball_url);
      if (!response.ok) {
        throw new Error(
          `Received ${response.status} status code from the GitHub API.`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      fs.ensureDirSync(lightnetExplorerDir);
      fs.writeFileSync(
        path.resolve(`${lightnetExplorerDir}/${release.name}.zip`),
        Buffer.from(arrayBuffer),
        'binary'
      );
    }
  );
}

async function handleExplorerReleasePresence(explorerReleasePath, release) {
  if (
    !fs.existsSync(explorerReleasePath) ||
    fs.readdirSync(explorerReleasePath).length === 0
  ) {
    const tmpDir = path.resolve(`${explorerReleasePath}-tmp`);
    await step('Preparing the file-system', async () => {
      fs.removeSync(explorerReleasePath);
      fs.ensureDirSync(explorerReleasePath);
      fs.ensureDirSync(tmpDir);
    });
    await downloadExplorerRelease(release);
    await step('Unpacking the release bundle', async () => {
      await decompress(`${explorerReleasePath}.zip`, tmpDir);
    });
    await step('Restructuring the file-system', async () => {
      const extractedDir = fs.readdirSync(tmpDir)[0];
      fs.moveSync(
        path.resolve(`${tmpDir}/${extractedDir}`),
        path.resolve(explorerReleasePath),
        { overwrite: true }
      );
    });
    await step('Cleaning up', async () => {
      fs.removeSync(`${explorerReleasePath}.zip`);
      fs.removeSync(tmpDir);
    });
  }
}

function getProcessToLogFileMapping({ mode, archive }) {
  let mapping = new Map(Constants.lightnetProcessToLogFileMapping);
  if (mode === 'single-node') {
    mapping = new Map([...mapping].slice(0, 3));
    mapping.forEach((value, key) => {
      mapping.set(
        key,
        `${ContainerLogFilesPrefix.SINGLE_NODE}/${value.split(',')[0]}`
      );
    });
  } else {
    mapping.delete(multiPurposeMinaDaemonProcessName);
    mapping.forEach((value, key) => {
      const logFilePaths = value.split(',');
      mapping.set(
        key,
        `${
          archiveNodeApiProcessName === key
            ? ContainerLogFilesPrefix.SINGLE_NODE
            : ContainerLogFilesPrefix.MULTI_NODE
        }/${logFilePaths.length === 1 ? logFilePaths[0] : logFilePaths[1]}`
      );
    });
  }
  if (!archive) {
    mapping.delete(archiveNodeApiProcessName);
    mapping.delete(minaArchiveProcessName);
  }
  return mapping;
}

async function promptForDockerContainerProcess(processToLogFileMapping) {
  const response = await enquirer.prompt({
    type: 'select',
    name: 'selectedProcess',
    choices: [...processToLogFileMapping.keys()],
    message: () => {
      return chalk.reset(
        'Please select the Docker container process to follow the logs of'
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
    result: (val) => val.trim(),
  });
  return response.selectedProcess;
}

async function checkDockerEngineAvailability() {
  await step('Checking the Docker Engine availability', async () => {
    if (!shell.which('docker')) {
      console.log(
        '\n\nPlease ensure that Docker Engine is installed, then try again.' +
          '\nSee https://docs.docker.com/engine/install/ for more information.'
      );
      shell.exit(1);
    }
    const { code } = shell.exec('docker ps -a', { silent: !isDebug });
    if (code !== 0) {
      console.log(
        '\n\nPlease ensure that Docker Engine is running, then try again.'
      );
      shell.exit(1);
    }
  });
}

async function handleStartCommandChecks(containerName) {
  const containerState = getDockerContainerState(containerName);
  if (
    DockerContainerState.RUNNING === containerState &&
    fs.existsSync(lightnetConfigFile)
  ) {
    console.log(
      chalk.red(
        '\n\nThe lightweight Mina blockchain network is already running!'
      )
    );
    shell.exit(1);
  } else if (
    DockerContainerState.NOT_FOUND !== containerState &&
    (!fs.existsSync(lightnetConfigFile) ||
      !dockerContainerIdMatchesConfig(containerName))
  ) {
    await handleDockerContainerPresence();
  }
}

async function handleStopCommandChecks(containerName) {
  if (
    DockerContainerState.NOT_FOUND !== getDockerContainerState(containerName) &&
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
    result: (val) => val.trim().toLowerCase(),
  });
  if (res.proceed === 'no') {
    shell.exit(0);
  }
}

function getDockerContainerState(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f ${quotes}{{.State.Status}}${quotes} ${containerName}`,
    { silent: !isDebug }
  );
  return stdout.trim() === '' ? DockerContainerState.NOT_FOUND : stdout.trim();
}

function getDockerContainerId(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f ${quotes}{{.Id}}${quotes} ${containerName}`,
    { silent: !isDebug }
  );
  return stdout.trim();
}

function getDockerContainerVolume(containerName) {
  const { stdout } = shell.exec(
    `docker inspect -f ${quotes}{{range .Mounts}}{{if eq .Type ${escapeQuotes}"volume${escapeQuotes}"}}{{.Name}}{{end}}{{end}}${quotes} ${containerName}`,
    { silent: !isDebug }
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
    await shellExec(`docker stop ${containerName}`, { silent: !isDebug });
  } catch (error) {
    printErrorIfDebug(error);
  }
}

async function removeDockerContainer(containerName) {
  try {
    await shellExec(`docker rm ${containerName}`, { silent: !isDebug });
  } catch (error) {
    printErrorIfDebug(error);
  }
}

async function removeDockerVolume(volume) {
  try {
    await shellExec(`docker volume rm ${volume}`, { silent: !isDebug });
  } catch (error) {
    printErrorIfDebug(error);
  }
}

async function removeDanglingDockerImages() {
  await shellExec('docker image prune -f --filter "dangling=true"', {
    silent: !isDebug,
  });
}

async function streamDockerContainerFileContent(containerName, filePath) {
  try {
    const border = getBorderCharacters('norc');
    console.log(
      '\n' +
        table(
          [[chalk.reset('Use Ctrl+C to stop the file content streaming.')]],
          {
            border,
          }
        )
    );
    await shellExec(`docker exec ${containerName} tail -n 50 -f ${filePath}`, {
      silent: false,
    });
  } catch (error) {
    printErrorIfDebug(error);
    console.log(
      chalk.red(
        '\nIssue happened while streaming the Docker container file content!'
      )
    );
    shell.exit(1);
  }
}

async function saveDockerContainerProcessesLogs() {
  const logsDir = createLogsDirectory();
  try {
    await fs.ensureDir(logsDir);
    const { mode, archive } = fs.readJSONSync(lightnetConfigFile);
    const logFilePaths = getLogFilePaths(mode);
    if (mode === 'single-node') {
      await processSingleNodeLogs(logFilePaths, logsDir);
    } else {
      if (archive) {
        await processArchiveNodeApiLogs(logsDir);
      }
      await processMultiNodeLogs(logFilePaths, logsDir);
    }
    return logsDir;
  } catch (error) {
    printErrorIfDebug(error);
    fs.removeSync(logsDir);
    return null;
  }
}

function createLogsDirectory() {
  const timeZoneOffset = new Date().getTimezoneOffset() * 60000;
  const localMoment = new Date(Date.now() - timeZoneOffset);
  return path.resolve(
    `${lightnetLogsDir}/${localMoment
      .toISOString()
      .split('.')[0]
      .replace(/:/g, '-')}`
  );
}

function getLogFilePaths(mode) {
  return [...Constants.lightnetProcessToLogFileMapping.values()].map(
    (value) => {
      const logFilePaths = value.split(',');
      return mode === 'single-node' || logFilePaths.length === 1
        ? logFilePaths[0]
        : logFilePaths[1];
    }
  );
}

async function processSingleNodeLogs(logFilePaths, logsDir) {
  for (const logFilePath of logFilePaths) {
    try {
      await copyContainerLogToHost(
        logFilePath,
        logsDir,
        ContainerLogFilesPrefix.SINGLE_NODE
      );
    } catch (error) {
      printErrorIfDebug(error);
    }
  }
}

async function processMultiNodeLogs(logFilePaths, logsDir) {
  for (const logFilePath of logFilePaths) {
    try {
      await copyContainerLogToHost(
        logFilePath,
        logsDir,
        ContainerLogFilesPrefix.MULTI_NODE
      );
    } catch (error) {
      printErrorIfDebug(error);
    }
  }
}

async function processArchiveNodeApiLogs(logsDir) {
  try {
    await copyContainerLogToHost(
      Constants.lightnetProcessToLogFileMapping.get(archiveNodeApiProcessName),
      logsDir,
      ContainerLogFilesPrefix.SINGLE_NODE
    );
  } catch (error) {
    printErrorIfDebug(error);
  }
}

async function copyContainerLogToHost(logFilePath, logsDir, prefix) {
  const destinationFilePath = path.resolve(
    `${logsDir}/${logFilePath.replace(/\//g, '_')}`
  );
  await shellExec(
    `docker cp ${lightnetDockerContainerName}:${prefix}/${logFilePath} ${destinationFilePath}`,
    { silent: !isDebug }
  );
}

async function waitForBlockchainNetworkReadiness(mode) {
  let blockchainSyncAttempt = 1;
  let blockchainIsReady = false;
  const maxAttempts = mode === 'single-node' ? 90 : 210;
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
        if (responseJson?.data?.syncStatus === 'SYNCED') {
          blockchainIsReady = true;
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, pollingIntervalMs)
          );
        }
      }
    } catch (error) {
      printErrorIfDebug(error);
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
    }
    blockchainSyncAttempt++;
  }
  if (!blockchainIsReady) {
    const statusColored = chalk.red.bold('is not ready');
    console.log(
      '\n\nMaximum blockchain network readiness check attempts reached.' +
        `\nThe blockchain network ${statusColored}.` +
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
      `${quotes}Status: {{.State.Status}}; ` +
      `Is running: {{.State.Running}}; ` +
      `{{if .State.ExitCode}}Exit code: {{.State.ExitCode}}; {{end}}` +
      `Killed by OOM: {{.State.OOMKilled}}; ` +
      `{{if .State.Error}}Error: {{.State.Error}}{{end}}${quotes} ${containerName}`,
    { silent: !isDebug }
  );
  const boldTitle = chalk.reset.bold('\nDocker container state\n');
  console.log(boldTitle + stdout.trim());
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
  console.log(boldTitle);
  console.log(
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
    'Logs produced by different processes are redirected into the files' +
      '\nlocated by the following path patterns inside the container:'
  );
  const logs = [
    [chalk.reset(`${ContainerLogFilesPrefix.SINGLE_NODE}/logs/*.log`)],
  ];
  if (mode === 'multi-node') {
    logs.push([
      chalk.reset(`${ContainerLogFilesPrefix.MULTI_NODE}/**/logs/*.log`),
    ]);
  }
  console.log(boldTitle);
  console.log(
    table(logs, {
      border,
    })
  );
  console.log(
    chalk.yellow.bold('Note:') +
      ' By default, important logs of the current session will be saved' +
      '\nto the host file system during the ' +
      chalk.green.bold('zk lightnet stop') +
      ' command execution.' +
      '\nTo disable this behavior, please use the ' +
      chalk.reset.bold('--no-save-logs') +
      ' option.'
  );
}

async function printBlockchainNetworkProperties() {
  const border = getBorderCharacters('norc');
  const boldTitle = chalk.reset.bold('\nBlockchain network properties');
  const noData = [
    [chalk.yellow('No data available yet. Please try again a bit later.')],
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
      if (!responseJson?.data) {
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
  } catch (error) {
    printErrorIfDebug(error);
    data = noData;
  }
  console.log(boldTitle);
  console.log(
    table(data, {
      border,
    })
  );
}

function printZkAppSnippet() {
  const boldTitle = chalk.reset.bold('zkApp snippet using o1js API');
  console.log(boldTitle);
  console.log(
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
const feePayerAccount = feePayerPrivateKey.toPublicKey();

...

// Release previously acquired key pair
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: feePayerAccount.toBase58(),
});
if (keyPairReleaseMessage) console.log(keyPairReleaseMessage);`
    )
  );
}

function secondsToHms(seconds) {
  seconds = Number(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor((seconds % 3600) % 60);

  let hDisplay = '';
  if (h > 0) {
    hDisplay = h + (h == 1 ? ' hour, ' : ' hours, ');
  }
  let mDisplay = '';
  if (m > 0) {
    mDisplay = m + (m == 1 ? ' minute, ' : ' minutes, ');
  }
  let sDisplay = '';
  if (s > 0) {
    sDisplay = s + (s == 1 ? ' second' : ' seconds');
  }
  const result = hDisplay + mDisplay + sDisplay;
  return result.endsWith(', ') ? result.slice(0, -2) : result;
}

function printErrorIfDebug(error) {
  if (isDebug) {
    console.log(
      chalk.red(
        '\n\nAn error occurred during the execution of the command:\n\n' +
          chalk.reset(
            error.message || error.toString() || JSON.stringify(error)
          ) +
          '\n'
      )
    );
  }
}
