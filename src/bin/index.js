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
import { project } from '../lib/project.js';
import system from '../lib/system.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  .version(
    fs.readJSONSync(path.join(__dirname, '..', '..', 'package.json')).version
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
