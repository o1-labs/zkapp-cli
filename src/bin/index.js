#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import url from 'node:url';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import config from '../lib/config.js';
import Constants from '../lib/constants.js';
import deploy from '../lib/deploy.js';
import example from '../lib/example.js';
import file from '../lib/file.js';
import {
  lightnetExplorer,
  lightnetFollowLogs,
  lightnetSaveLogs,
  lightnetStart,
  lightnetStatus,
  lightnetStop,
} from '../lib/lightnet.js';
import project from '../lib/project.js';
import system from '../lib/system.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

yargs(hideBin(process.argv))
  .scriptName(chalk.green('zk'))
  .usage('Usage: $0 <command> [options]')
  .strictCommands()
  .strictOptions()
  .updateStrings(getCustomizedStrings())
  .demandCommand(1, chalk.red('Please provide a command.'))
  .command(projectCli())
  .command(fileCli())
  .command(configCli())
  .command(deployCli())
  .command(exampleCli())
  .command(systemCli())
  .command(lightnetCli())
  .version(
    fs.readJsonSync(path.join(__dirname, '..', '..', 'package.json')).version
  )
  .alias('h', 'help')
  .alias('v', 'version')
  .epilog(
    // chalk.reset is a hack to force the terminal to retain a line break below
    chalk.reset(
      `
      
         __         _         
        /_ |       | |        
     ___ | |   __ _| |__  ___ 
    / _ \\| |  / _\` | '_ \\/ __|
   | (_) | |_| (_| | |_) \\__ \\
    \\___/|____\\__,_|_.__/|___/         
         
        https://o1labs.org
                                  
      `
    )
  ).argv;

function projectCli() {
  return {
    command: ['project [name]', 'proj [name]', 'p [name]'],
    describe: 'Create a new project',
    builder: {
      name: { demand: true, string: true, hidden: true },
      ui: {
        demand: false,
        string: true,
        hidden: false,
        choices: Constants.uiTypes,
        description: 'Creates an accompanying UI',
      },
    },
    handler: async (argv) => await project(argv),
  };
}

function fileCli() {
  return {
    command: ['file [name]', 'f [name]'],
    describe: 'Create a file and generate the corresponding test file',
    builder: { name: { demand: true, string: true, hidden: true } },
    handler: async (argv) => await file(argv.name),
  };
}

function configCli() {
  return {
    command: ['config [list] [lightnet]'],
    describe: 'List or add a new deploy alias',
    builder: {
      list: {
        alias: 'l',
        demand: false,
        boolean: true,
        hidden: false,
        default: false,
        description:
          'Whether to list the available deploy aliases and their configurations.',
      },
      lightnet: {
        alias: 'ln',
        demand: false,
        boolean: true,
        hidden: false,
        default: false,
        description:
          'Whether to automatically configure the deploy alias compatible with the lightweight Mina blockchain network.',
      },
    },
    handler: async (argv) => await config(argv),
  };
}

function deployCli() {
  return {
    command: ['deploy [alias]'],
    describe: 'Deploy or redeploy a zkApp',
    builder: {
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
    handler: async (argv) => await deploy(argv),
  };
}

function exampleCli() {
  return {
    command: ['example [name]', 'e [name]'],
    describe: 'Create an example project',
    builder: {
      name: {
        demand: false,
        string: true,
        hidden: false,
        choices: Constants.exampleTypes,
      },
    },
    handler: async (argv) => await example(argv.name),
  };
}

function systemCli() {
  return {
    command: ['system', 'sys', 's'],
    describe: 'Show system info',
    builder: {},
    handler: async () => await system(),
  };
}

function lightnetCli() {
  return {
    command: ['lightnet <sub-command> [options]'],
    describe:
      'Manage the lightweight Mina blockchain network for zkApps development and testing purposes.\nMore information can be found at:\nhttps://docs.minaprotocol.com/zkapps/testing-zkapps-lightnet',
    builder: (yargs) => {
      yargs
        .command(
          [
            'start [mode] [type] [proof-level] [mina-branch] [archive] [sync] [pull] [mina-log-level]',
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
              default: 'compatible',
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
          },
          async (argv) => await lightnetStart(argv)
        )
        .command(
          ['stop [save-logs] [clean-up]'],
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
          },
          async (argv) => await lightnetStop(argv)
        )
        .command(
          ['status'],
          'Get the lightweight Mina blockchain network status.',
          async () => await lightnetStatus()
        )
        .command(
          ['logs <sub-command> [options]'],
          'Handle the lightweight Mina blockchain network Docker container processes logs.',
          (yargs) => {
            yargs
              .command(
                ['save'],
                'Save the lightweight Mina blockchain network Docker container processes logs to the host file system.',
                async () => await lightnetSaveLogs()
              )
              .command(
                ['follow [process]'],
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
                },
                async (argv) => await lightnetFollowLogs(argv)
              );
          }
        )
        .command(
          ['explorer [use] [list]'],
          'Launch the lightweight Mina explorer.',
          {
            use: {
              alias: 'u',
              demand: false,
              string: true,
              hidden: false,
              default: 'latest',
              description:
                'The version of the lightweight Mina explorer to use.\nThe "latest" value will use the latest available version.',
            },
            list: {
              alias: 'l',
              demand: false,
              boolean: true,
              hidden: false,
              default: false,
              description:
                'Whether to list the available versions of the lightweight Mina explorer.',
            },
          },
          async (argv) => await lightnetExplorer(argv)
        );
    },
  };
}

function getCustomizedStrings() {
  // Overridden messages source can be found here:
  // https://github.com/yargs/yargs/blob/master/locales/en.json
  return {
    'Not enough non-option arguments: got %s, need at least %s': {
      one: chalk.red(
        'Not enough non-option arguments: got %s, need at least %s'
      ),
      other: chalk.red(
        'Not enough non-option arguments: got %s, need at least %s'
      ),
    },
    'Too many non-option arguments: got %s, maximum of %s': {
      one: chalk.red('Too many non-option arguments: got %s, maximum of %s'),
      other: chalk.red('Too many non-option arguments: got %s, maximum of %s'),
    },
    'Missing argument value: %s': {
      one: chalk.red('Missing argument value: %s'),
      other: chalk.red('Missing argument values: %s'),
    },
    'Missing required argument: %s': {
      one: chalk.red('Missing required argument: %s'),
      other: chalk.red('Missing required arguments: %s'),
    },
    'Unknown argument: %s': {
      one: chalk.red('Unknown argument: %s'),
      other: chalk.red('Unknown arguments: %s'),
    },
    'Unknown command: %s': {
      one: chalk.red('Unknown command: %s'),
      other: chalk.red('Unknown commands: %s'),
    },
    'Invalid values:': chalk.red('Invalid values:'),
    'Argument: %s, Given: %s, Choices: %s': chalk.red(
      'Argument: %s, Given: %s, Choices: %s'
    ),
    'Argument check failed: %s': chalk.red('Argument check failed: %s'),
    'Implications failed:': chalk.red('Missing dependent arguments:'),
    'Not enough arguments following: %s': chalk.red(
      'Not enough arguments following: %s'
    ),
    'Invalid JSON config file: %s': chalk.red('Invalid JSON config file: %s'),
    'Arguments %s and %s are mutually exclusive': chalk.yellow(
      'Arguments %s and %s are mutually exclusive'
    ),
    deprecated: chalk.yellow('deprecated'),
    'deprecated: %s': chalk.yellow('deprecated: %s'),
  };
}
