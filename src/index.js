#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const system = require('./system');

yargs(hideBin(process.argv))
  .scriptName('snapp')
  .usage('Usage: $0 <cmd> [options]')
  .command(
    ['sys', 'system'],
    'Show system info to provide with issue reports.',
    {},
    () => system()
  )
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand(1, 'Please provide a command.').argv;
