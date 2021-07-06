#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .scriptName('snapp')
  .usage('Usage: $0 <cmd> [options]')
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand(1, 'Please provide a command.').argv;
