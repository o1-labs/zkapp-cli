import { homedir } from 'os';
import path from 'path';

/**
 * @typedef {'next' | 'svelte' | 'nuxt' | 'empty' | 'none'} UiType
 * @typedef {'sudoku' | 'tictactoe'} ExampleType
 * @typedef {'single-node' | 'multi-node'} LightnetMode
 * @typedef {'fast' | 'real'} LightnetType
 * @typedef {'none' | 'full'} LightnetProofLevel
 * @typedef {'o1js-main' | 'berkeley' | 'develop'} LightnetMinaBranch
 *
 * @type {{ uiTypes: UiType[], exampleTypes: ExampleType[], feePayerCacheDir: string, lightnetWorkDir: string, lightnetModes: LightnetMode[], lightnetTypes: LightnetType[], lightnetProofLevels: LightnetProofLevel[], lightnetMinaBranches: LightnetMinaBranch[] }}
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
});

export default Constants;
