#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const system = require('../lib/system');
const project = require('../lib/project');
const file = require('../lib/file');

yargs(hideBin(process.argv))
  .scriptName('snap')
  .usage('Usage: $0 <command> [options]')
  .command(
    ['project <name>', 'proj <name>', 'p <name>'],
    'Create a new project.',
    {},
    (argv) => project(argv.name)
  )
  .command(
    ['file <name>', 'f <name>'],
    'Create a new file & test.',
    {},
    (argv) => file(argv.name)
  )
  .command(['system', 'sys', 's'], 'Show system info.', {}, () => system())
  .alias('h', 'help')
  .alias('v', 'version')
  .strict()
  .demandCommand(1, 'Please provide a command.').argv;
