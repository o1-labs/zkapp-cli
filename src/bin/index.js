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
  .demandCommand(1, 'Please provide a command.')
  .strict() // disallow superfluous args
  .epilog(
    `Note:
  You can use "snapp" or "snap". Both CLI aliases are provided.


    █▄ ▄█ █ █▄ █ ▄▀▄
    █ ▀ █ █ █ ▀█ █▀█

     MINA Protocol

  `
  ).argv;
