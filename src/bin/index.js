#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import config from '../lib/config.js';
import Constants from '../lib/constants.js';
import { deploy } from '../lib/deploy.js';
import { example } from '../lib/example.js';
import { file } from '../lib/file.js';
import {
  lightnetExplorer,
  lightnetFollowLogs,
  lightnetSaveLogs,
  lightnetStart,
  lightnetStatus,
  lightnetStop,
} from '../lib/lightnet.js';
import { project } from '../lib/project.js';
import system from '../lib/system.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commonOptions = {
  debug: {
    alias: 'd',
    demand: false,
    boolean: true,
    hidden: false,
    default: false,
    description: 'Whether to print the debug information.',
  },
};

yargs(hideBin(process.argv))
  .scriptName(chalk.green('zk'))
  .usage('Usage: $0 <command> [options]')
  .strictCommands()
  .strictOptions()

  // https://github.com/yargs/yargs/issues/199
  // https://github.com/yargs/yargs/blob/master/locales/en.json
  .updateStrings({
    'Missing required argument: %s': {
      one: chalk.red('Missing required argument: %s'),
    },
    'Unknown argument: %s': {
      one: chalk.red('Unknown argument: %s'),
    },
    'Unknown command: %s': {
      one: chalk.red('Unknown command: %s'),
    },
    'Invalid values:': chalk.red('Invalid values:'),
    'Argument: %s, Given: %s, Choices: %s': chalk.red(
      `%s was %s. Must be one of: %s.`
    ),
    'Not enough non-option arguments: %s': {
      one: chalk.red('Not enough non-option arguments: %s'),
    },
  })
  .demandCommand(1, chalk.red('Please provide a command.'))

  .command(
    ['project [name]', 'proj [name]', 'p [name]'],
    'Create a new project',
    {
      name: { demand: true, string: true, hidden: true },
      ui: {
        demand: false,
        string: true,
        hidden: false,
        choices: Constants.uiTypes,
        description: 'Creates an accompanying UI',
      },
    },
    async (argv) => await project(argv)
  )
  .command(
    ['file [name]', 'f [name]'],
    'Create a file and generate the corresponding test file',
    { name: { demand: true, string: true, hidden: true } },
    async (argv) => await file(argv.name)
  )
  .command(['config'], 'Add a new deploy alias', {}, async () => await config())
  .command(
    ['deploy [alias]'],
    'Deploy or redeploy a zkApp',
    {
      alias: { demand: false, string: true, hidden: true },
      y: {
        alias: 'yes',
        boolean: true,
        demand: false,
        hidden: false,
        description:
          'Respond `yes` to all confirmation prompts.\nAllows running non-interactively within a script.',
      },
    },
    async (argv) => await deploy(argv)
  )
  .command(
    ['example [name]', 'e [name]'],
    'Create an example project',
    {
      name: {
        demand: false,
        string: true,
        hidden: false,
        choices: Constants.exampleTypes,
      },
    },
    async (argv) => await example(argv.name)
  )
  .command(['system', 'sys', 's'], 'Show system info', {}, () => system())
  .command(
    ['lightnet <sub-command> [options]'],
    'Manage the lightweight Mina blockchain for zkApps development and testing purposes.\nYou can find more information about the Docker image in use at\nhttps://hub.docker.com/r/o1labs/mina-local-network',
    (yargs) => {
      yargs
        .command(
          [
            'start [mode] [type] [proof-level] [mina-branch] [archive] [sync] [pull] [mina-log-level] [debug]',
          ],
          'Start the lightweight Mina blockchain network Docker container.',
          {
            mode: {
              alias: 'm',
              demand: false,
              string: true,
              hidden: false,
              choices: Constants.lightnetModes,
              default: 'single-node',
              description:
                'Whether to form the network with one node or with multiple network participants.\n"single-node" value will make the network faster.',
            },
            type: {
              alias: 't',
              demand: false,
              string: true,
              hidden: false,
              choices: Constants.lightnetTypes,
              default: 'fast',
              description:
                'Whether to configure the network to be fast or slower with closer-to-real-world properties.',
            },
            'proof-level': {
              alias: 'p',
              demand: false,
              string: true,
              hidden: false,
              choices: Constants.lightnetProofLevels,
              default: 'none',
              description:
                '"none" value will make the network faster by disabling the blockchain SNARK proofs.',
            },
            'mina-branch': {
              alias: 'b',
              demand: false,
              string: true,
              hidden: false,
              choices: Constants.lightnetMinaBranches,
              default: 'o1js-main',
              description:
                'One of the major Mina repository branches the Docker image artifacts were compiled against.',
            },
            archive: {
              alias: 'a',
              demand: false,
              boolean: true,
              hidden: false,
              default: true,
              description:
                'Whether to start the Mina Archive process and Archive Node API application within the Docker container.',
            },
            sync: {
              alias: 's',
              demand: false,
              boolean: true,
              hidden: false,
              default: true,
              description:
                'Whether to wait for the network to reach the synchronized state.',
            },
            pull: {
              alias: 'u',
              demand: false,
              boolean: true,
              hidden: false,
              default: true,
              description:
                'Whether to pull the latest version of the Docker image from the Docker Hub.',
            },
            'mina-log-level': {
              alias: 'l',
              demand: false,
              string: true,
              hidden: false,
              choices: Constants.lightnetMinaProcessesLogLevels,
              default: 'Trace',
              description: 'Mina processes logging level to use.',
            },
            ...commonOptions,
          },
          async (argv) => await lightnetStart(argv)
        )
        .command(
          ['stop [save-logs] [clean-up] [debug]'],
          'Stop the lightweight Mina blockchain network Docker container and perform the cleanup.',
          {
            'save-logs': {
              alias: 'l',
              demand: false,
              boolean: true,
              hidden: false,
              default: true,
              description:
                'Whether to save the Docker container processes logs to the host file system.',
            },
            'clean-up': {
              alias: 'c',
              demand: false,
              boolean: true,
              hidden: false,
              default: true,
              description:
                'Whether to remove the Docker container, dangling Docker images, consumed Docker volume, and the blockchain network configuration.',
            },
            ...commonOptions,
          },
          async (argv) => await lightnetStop(argv)
        )
        .command(
          ['status [debug]'],
          'Get the lightweight Mina blockchain network status.',
          {
            ...commonOptions,
          },
          async (argv) =>
            await lightnetStatus({
              preventDockerEngineAvailabilityCheck: false,
              debug: argv.debug,
            })
        )
        .command(
          ['logs <sub-command> [options]'],
          'Handle the lightweight Mina blockchain network Docker container processes logs.',
          (yargs) => {
            yargs
              .command(
                ['save [debug]'],
                'Save the lightweight Mina blockchain network Docker container processes logs to the host file system.',
                {
                  ...commonOptions,
                },
                async (argv) => await lightnetSaveLogs(argv)
              )
              .command(
                ['follow [process] [debug]'],
                'Follow one of the lightweight Mina blockchain network Docker container processes logs.',
                {
                  process: {
                    alias: 'p',
                    demand: false,
                    string: true,
                    hidden: false,
                    choices: [
                      ...Constants.lightnetProcessToLogFileMapping.keys(),
                    ],
                    description:
                      'The name of the Docker container process to follow the logs of.',
                  },
                  ...commonOptions,
                },
                async (argv) => await lightnetFollowLogs(argv)
              )
              .demandCommand();
          }
        )
        .command(
          ['explorer [use] [list] [debug]'],
          'Launch the lightweight Mina Explorer.',
          {
            use: {
              alias: 'u',
              demand: false,
              string: true,
              hidden: false,
              default: 'latest',
              description:
                'The version of the lightweight Mina Explorer to use.\nThe "latest" value will use the latest available version.',
            },
            list: {
              alias: 'l',
              demand: false,
              boolean: true,
              hidden: false,
              default: false,
              description:
                'Whether to list the available versions of the lightweight Mina Explorer.',
            },
            ...commonOptions,
          },
          async (argv) => await lightnetExplorer(argv)
        )
        .demandCommand();
    }
  )
  .version(
    fs.readJsonSync(path.join(__dirname, '..', '..', 'package.json')).version
  )
  .alias('h', 'help')
  .alias('v', 'version')

  .epilog(
    // chalk.reset is a hack to force the terminal to retain a line break below
    chalk.reset(
      `

    █▄ ▄█ █ █▄ █ ▄▀▄
    █ ▀ █ █ █ ▀█ █▀█

     Mina Protocol
      `
    )
  ).argv;
