const os = require('os');

const Constants = Object.freeze({
  uiTypes: ['next', 'svelte', 'nuxt', 'empty', 'none'],
  exampleTypes: ['sudoku', 'tictactoe'],
  feePayerCacheDir: `${os.homedir()}/.cache/zkapp-cli/keys`,
});

module.exports = {
  Constants,
};
