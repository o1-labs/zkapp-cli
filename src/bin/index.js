#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { project } = require('../lib/project');
const { file } = require('../lib/file');
const { config, configShow } = require('../lib/config');
const { configSet } = require('../lib/configSet');
const { deploy } = require('../lib/deploy');
const { genKeyPair } = require('../lib/keypair');
const { example } = require('../lib/example');
const { system } = require('../lib/system');
const chalk = require('chalk');

const _g = chalk.green;
const _r = chalk.reset;
const _red = chalk.red;

yargs(hideBin(process.argv))
  .scriptName(_g('zk'))
  .usage('Usage: $0 <command> [options]')
  .strictCommands()
  .strictOptions()

  // https://github.com/yargs/yargs/issues/199
  // https://github.com/yargs/yargs/blob/master/locales/en.json
  .updateStrings({
    'Missing required argument: %s': {
      one: _red('Missing required argument: %s'),
    },
    'Unknown argument: %s': {
      one: _red('Unknown argument: %s'),
    },
    'Unknown command: %s': {
      one: _red('Unknown command: %s'),
    },
    'Invalid values:': _red('Invalid values:'),
    'Argument: %s, Given: %s, Choices: %s': _red(
      `%s was %s. Must be one of: %s.`
    ),
  })
  .demandCommand(1, _red('Please provide a command.'))

  .command(
    ['project [name]', 'proj [name]', 'p [name]'],
    'Create a new project',
    {
      name: { demand: true, string: true, hidden: true },
      ui: {
        demand: false,
        string: true,
        hidden: false,
        choices: ['next', 'svelte', 'nuxt', 'empty', 'none'],
        description: 'Creates an accompanying UI',
      },
    },
    async (argv) => await project(argv)
  )
  .command(
    ['file [name]', 'f [name]'],
    'Create a file and generate the corresponding test file',
    { name: { demand: true, string: true, hidden: true } },
    (argv) => file(argv.name)
  )
  .command(
    ['config [show [alias]]'],
    'Add a new deploy alias or display properties',
    {
      show: {
        description: 'Display the config file',
        demand: false,
        boolean: true,
        hidden: false,
      },
      alias: {
        description: 'Display properties of the deploy alias',
        demand: false,
        string: true,
        hidden: false,
      },
    },
    (argv) => (argv.show ? configShow(argv.alias) : config())
  )
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
    ['set <alias> <prop> <value>'],
    'Set a new property value for the alias',
    {
      alias: { demand: true, string: true, hidden: false },
      prop: { demand: true, string: true, hidden: false },
      value: { demand: true, string: true, hidden: false },
    },
    async (argv) =>
      await configSet({ alias: argv.alias, prop: argv.prop, value: argv.value })
  )
  .command(
    [
      'keypair <alias> [network]',
      'key <alias> [network]',
      'k <alias> [network]',
    ],
    'Generate a new keypair for the given network and display the public key',
    {
      alias: { demand: true, string: true, hidden: false },
      network: { demand: false, string: true, hidden: false },
    },
    async (argv) =>
      await genKeyPair({ deployAliasName: argv.alias, network: argv.network })
  )
  .command(
    ['example [name]', 'e [name]'],
    'Create an example project',
    {
      name: {
        demand: false,
        string: true,
        hidden: false,
        choices: ['sudoku', 'tictactoe'],
      },
    },
    async (argv) => await example(argv.name)
  )
  .command(['system', 'sys'], 'Show system info', {}, system)
  .alias('h', 'help')
  .alias('v', 'version')

  .epilog(
    // _r is a hack to force the terminal to retain a line break below
    _r(
      `

    █▄ ▄█ █ █▄ █ ▄▀▄
    █ ▀ █ █ █ ▀█ █▀█

     Mina Protocol
      `
    )
  ).argv;
