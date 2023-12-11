import { homedir } from 'os';
import path from 'path';

/**
 * @typedef {'next' | 'svelte' | 'nuxt' | 'empty' | 'none'} UiType
 * @typedef {'sudoku' | 'tictactoe'} ExampleType
 * @typedef {'single-node' | 'multi-node'} LightnetMode
 * @typedef {'fast' | 'real'} LightnetType
 * @typedef {'none' | 'full'} LightnetProofLevel
 * @typedef {'o1js-main' | 'berkeley' | 'develop'} LightnetMinaBranch
 * @typedef {'Spam' | 'Trace' | 'Debug' | 'Info' | 'Warn' | 'Error' | 'Fatal'} LightnetMinaLogLevel
 *
 * @type {{ uiTypes: UiType[], exampleTypes: ExampleType[], feePayerCacheDir: string, lightnetWorkDir: string, lightnetModes: LightnetMode[], lightnetTypes: LightnetType[], lightnetProofLevels: LightnetProofLevel[], lightnetMinaBranches: LightnetMinaBranch[], lightnetProcessToLogFileMapping: Map<string, string>, lightnetMinaProcessesLogLevels: LightnetMinaLogLevel[] }}
 */
const Constants = Object.freeze({
  uiTypes: ['next', 'svelte', 'nuxt', 'empty', 'none'],
  exampleTypes: ['sudoku', 'tictactoe'],
  feePayerCacheDir: `${homedir()}/.cache/zkapp-cli/keys`,
  lightnetWorkDir: path.resolve(`${homedir()}/.cache/zkapp-cli/lightnet`),
  lightnetModes: ['single-node', 'multi-node'],
  lightnetTypes: ['fast', 'real'],
  lightnetProofLevels: ['none', 'full'],
  lightnetMinaBranches: ['o1js-main', 'berkeley', 'develop'],
  lightnetProcessToLogFileMapping: new Map([
    ['Archive-Node-API application', 'logs/archive-node-api.log'],
    ['Mina Archive process', 'logs/archive-node.log,archive/log.txt'],
    ['Mina multi-purpose Daemon', 'logs/single-node-network.log'],
    ['Fish BP #1', 'fish_0/log.txt'],
    ['Non-consensus node #1', 'node_0/log.txt'],
    ['Seed node #1', 'seed/log.txt'],
    ['SNARK coordinator #1', 'snark_coordinator/log.txt'],
    ['SNARK worker #1', 'snark_workers/worker_0/log.txt'],
    ['Whale BP #1', 'whale_0/log.txt'],
    ['Whale BP #2', 'whale_1/log.txt'],
  ]),
  lightnetMinaProcessesLogLevels: [
    'Spam',
    'Trace',
    'Debug',
    'Info',
    'Warn',
    'Error',
    'Fatal',
  ],
});

export default Constants;
