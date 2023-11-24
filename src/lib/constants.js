import { homedir } from 'os';
import path from 'path';

/**
 * @typedef {'next' | 'svelte' | 'nuxt' | 'empty' | 'none'} UiType
 * @typedef {'sudoku' | 'tictactoe'} ExampleType
 * @typedef {'single-node' | 'multi-node'} LightnetMode
 * @typedef {'fast' | 'real'} LightnetType
 * @typedef {'none' | 'full'} LightnetProofLevel
 * @typedef {'o1js-main' | 'berkeley' | 'develop'} LightnetMinaBranch
 * @typedef {{ archiveNodeApi: string, minaArchive: string, minaSingleNodeDaemon: string, minaFish1: string, minaFollowing1: string, minaSeed1: string, minaSnarkCoordinator1: string, minaSnarkWorker1: string, minaWhale1: string, minaWhale2: string }} LightnetProcessName
 *
 * @type {{ uiTypes: UiType[], exampleTypes: ExampleType[], feePayerCacheDir: string, lightnetWorkDir: string, lightnetModes: LightnetMode[], lightnetTypes: LightnetType[], lightnetProofLevels: LightnetProofLevel[], lightnetMinaBranches: LightnetMinaBranch[], lightnetProcessName: LightnetProcessName }}
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
  lightnetProcessName: Object.freeze({
    archiveNodeApi: 'Archive-Node-API application',
    minaArchive: 'Mina Archive process',
    minaSingleNodeDaemon: 'Mina multi-purpose Daemon',
    minaFish1: 'Fish BP #1',
    minaFollowing1: 'Non-consensus node #1',
    minaSeed1: 'Seed node #1',
    minaSnarkCoordinator1: 'SNARK coordinator #1',
    minaSnarkWorker1: 'SNARK worker #1',
    minaWhale1: 'Whale BP #1',
    minaWhale2: 'Whale BP #2',
  }),
});

export default Constants;
