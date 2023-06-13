const { green, red, bold, gray, reset } = require('chalk');

function formatPrefixSymbol(state) {
  // Shows a cyan question mark when not submitted.
  // Shows a green check mark when submitted.
  // Shows a red "x" if ctrl+C is pressed.

  // Can't override the validating prefix or styling unfortunately
  // https://github.com/enquirer/enquirer/blob/8d626c206733420637660ac7c2098d7de45e8590/lib/prompt.js#L125
  // if (state.validating) return ''; // use no symbol, instead of pointer

  if (!state.submitted) return state.symbols.question;
  return state.cancelled ? red(state.symbols.cross) : state.symbols.check;
}

const prompts = {
  deployAliasPrompts: (config) => [
    {
      type: 'input',
      name: 'deployAliasName',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose a name (can be anything):');
      },
      prefix: formatPrefixSymbol,
      validate: async (val) => {
        val = val.toLowerCase().trim().replace(' ', '-');
        if (!val) return red('Name is required.');
        if (Object.keys(config.deployAliases).includes(val)) {
          return red('Name already exists.');
        }
        return true;
      },
      result: (val) => val.toLowerCase().trim().replace(' ', '-'),
    },
    {
      type: 'input',
      name: 'url',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Set the Mina GraphQL API URL to deploy to:');
      },
      prefix: formatPrefixSymbol,
      validate: (val) => {
        if (!val) return red('Url is required.');
        return true;
      },
      result: (val) => val.trim().replace(/ /, ''),
    },
    {
      type: 'input',
      name: 'fee',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Set transaction fee to use when deploying (in MINA):');
      },
      prefix: formatPrefixSymbol,
      validate: (val) => {
        if (!val) return red('Fee is required.');
        if (isNaN(val)) return red('Fee must be a number.');
        if (val < 0) return red("Fee can't be negative.");
        return true;
      },
      result: (val) => val.trim().replace(/ /, ''),
    },
  ],

  initialFeepayerPrompts: (
    defaultFeePayerAlias,
    defaultFeePayerAddress,
    isFeepayerCached
  ) => [
    {
      type: 'select',
      name: 'feepayer',
      choices: [
        {
          name: `Recover fee-payer account from an existing base58 private key`,
          value: 'recover',
        },
        { name: 'Create a new feepayer key pair', value: 'create' },
      ],
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an account to pay transaction fees:');
      },
      result() {
        return this.focused.value;
      },
      skip() {
        return isFeepayerCached; // The prompt is only displayed if a feepayor has not been previously cached
      },
    },

    {
      type: 'select',
      name: 'feepayer',
      choices: [
        {
          name: `Use stored account ${defaultFeePayerAlias} (public key: ${defaultFeePayerAddress}) `,
          value: 'defaultCache',
        },
        {
          name: 'Use a different account (select to see options)',
          value: 'other',
        },
      ],
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an account to pay transaction fees:');
      },
      result() {
        return this.focused.value;
      },
      skip() {
        return !isFeepayerCached; // Only display this prompt question if feeyper is cached
      },
    },
  ],
  recoverFeepayerPrompts: [
    {
      type: 'input',
      name: 'feepayerKey',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Account private key (base58):');
      },
      skip() {
        return this.state.answers.feepayer !== 'create';
      },
    },
    {
      type: 'input',
      name: 'feepayerAliasName',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an alias for this account');
      },
      validate: async (val) => {
        val = val.toLowerCase().trim().replace(' ', '-');
        if (!val) return red('Fee-payer alias is required.');
        return true;
      },
    },
  ],
};
module.exports = {
  prompts,
};
