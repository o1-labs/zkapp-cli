const os = require('os');

/**
 * @typedef {'next' | 'svelte' | 'nuxt' | 'empty' | 'none'} UiType
 * @typedef {'sudoku' | 'tictactoe'} ExampleType
 *
 * @type {{ uiTypes: UiType[], exampleTypes: ExampleType[], feePayerCacheDir: string }}
 */
const Constants = Object.freeze({
  uiTypes: ['next', 'svelte', 'nuxt', 'empty', 'none'],
  exampleTypes: ['sudoku', 'tictactoe'],
  feePayerCacheDir: `${os.homedir()}/.cache/zkapp-cli/keys`,
});

module.exports = {
  Constants,
};
