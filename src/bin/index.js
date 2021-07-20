#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { file } = require('../lib/file');
const { project } = require('../lib/project');
const { system } = require('../lib/system');
const chalk = require('chalk');

const _g = chalk.green;
const _r = chalk.reset;
const _red = chalk.red;

yargs(hideBin(process.argv))
  .scriptName(_g('snap'))
  .usage('Usage: $0 <command> [options]')
  .strict() // disallow superfluous args

  // https://github.com/yargs/yargs/issues/199
  // https://github.com/yargs/yargs/blob/master/locales/en.json
  .updateStrings({
    'Missing required argument: %s': {
      one: _red('Missing required argument: %s'),
    },
    'Unknown argument: %s': {
      one: _red('Unknown argument: %s'),
    },
  })
  .demandCommand(1, _red('Please provide a command.'))

  .command(
    ['project [name]', 'proj [name]', 'p [name]'],
    'Create a new project',
    { name: { demand: true, string: true, hidden: true } },
    (argv) => project(argv.name)
  )
  .command(
    ['file [name]', 'f [name]'],
    'Create a new file & test',
    { name: { demand: true, string: true, hidden: true } },
    (argv) => file(argv.name)
  )
  .command(['system', 'sys', 's'], 'Show system info', {}, () => system())
  .alias('h', 'help')
  .alias('v', 'version')

  .epilog(
    // _r is a hack to force the terminal to retain a line break below
    _r(
      `Note:
  You can use "snapp" or "snap". Both CLI aliases are provided.


    █▄ ▄█ █ █▄ █ ▄▀▄
    █ ▀ █ █ █ ▀█ █▀█

     MINA Protocol
      `
    )
  ).argv;
