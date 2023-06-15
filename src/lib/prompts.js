const chalk = require('chalk');
const { green, red, reset } = chalk;
const { PrivateKey } = require('snarkyjs');

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
        return style('Create a name (can be anything):');
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
    defaultFeepayerAlias,
    defaultFeepayerAddress,
    isFeepayerCached
  ) => [
    {
      type: 'select',
      name: 'feepayer',
      choices: [
        {
          name: `Recover fee payer account from an existing base58 private key`,
          value: 'recover',
        },
        {
          name: `Create a new fee payer key pair
  NOTE: the private key will be stored in plain text on this computer.`,
          value: 'create',
        },
      ],
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose an account to pay transaction fees:');
      },

      skip() {
        return isFeepayerCached; // The prompt is only displayed if a feepayor has not been previously cached
      },
      result() {
        // Workaround for a bug in enquirer that returns the first value of choices when the
        // question is skipped https://github.com/enquirer/enquirer/issues/340 .
        // This returns the previous prompt value if prompt is skipped.
        if (isFeepayerCached) {
          return this.state.answers.feepayer;
        }
        return this.focused.value;
      },
    },
    {
      type: 'select',
      name: 'feepayer',
      choices: [
        {
          name: chalk`Use stored account {bold ${defaultFeepayerAlias}} (public key: {bold ${defaultFeepayerAddress}}) `,
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
      skip() {
        return !isFeepayerCached; // Only display this prompt question if feeypayer is cached
      },
      result() {
        // Workaround for a bug in enquirer that returns the first value of choices when the
        // question is skipped https://github.com/enquirer/enquirer/issues/340 .
        // This returns the previous prompt value if prompt is skipped.

        if (!isFeepayerCached) {
          return this.state.answers.feepayer;
        }
        return this.focused.value;
      },
    },
  ],
  recoverFeepayerPrompts: (cachedFeepayerAliases) => [
    {
      type: 'input',
      name: 'feepayerAliasName',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Create an alias for this account');
      },
      validate: async (val) => {
        val = val.toLowerCase().trim().split(' ').join('-');
        if (cachedFeepayerAliases?.includes(val))
          return red(`Fee payer alias ${val} already exists`);
        if (!val) return red('Fee payer alias is required.');
        return true;
      },
      result: (val) => val.toLowerCase().trim().split(' ').join('-'),
    },
    {
      type: 'input',
      name: 'feepayerKey',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style(`Account private key (base58):
  NOTE: the private key will be stored in plain text on this computer.
  Do NOT use an account which holds a substantial amount of MINA.`);
      },
      validate: async (val) => {
        val = val.trim();
        try {
          PrivateKey.fromBase58(val);
        } catch (err) {
          return red('Enter a valid private key.');
        }
        return true;
      },
      result: (val) => val.trim(),
    },
  ],
  feepayerAliasPrompt: (cachedFeepayerAliases) => [
    {
      type: 'input',
      name: 'feepayerAliasName',
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Create an alias for this account');
      },
      validate: async (val) => {
        val = val.toLowerCase().trim().split(' ').join('-');
        if (cachedFeepayerAliases?.includes(val))
          return red(`Fee payer alias ${val} already exists`);
        if (!val) return red('Fee payer alias is required.');
        return true;
      },
      result: (val) => val.toLowerCase().trim().split(' ').join('-'),
    },
  ],

  otherFeepayerPrompts: (cachedFeepayerAliases) => [
    {
      type: 'select',
      name: 'feepayer',
      choices: getFeepayorChoices(cachedFeepayerAliases),
      result() {
        return this.focused.value;
      },
    },
    {
      type: 'select',
      name: 'alternateCachedFeepayerAlias',
      choices: cachedFeepayerAliases,
      message: (state) => {
        const style = state.submitted && !state.cancelled ? green : reset;
        return style('Choose another saved fee payer:');
      },
      skip() {
        return this.state.answers.feepayer !== 'alternateCachedFeepayer';
      },
    },
  ],
};

function getFeepayorChoices(cachedFeepayerAliases) {
  const choices = [
    {
      name: `Recover fee payer account from an existing base58 private key`,
      value: 'recover',
    },
    {
      name: `Create a new fee payer key pair
  NOTE: the private key will be stored in plain text on this computer.`,
      value: 'create',
    },
  ];

  // Displays an additional prompt to select a different feepayer if more than one feepayer is cached
  if (cachedFeepayerAliases?.length > 1)
    choices.push({
      name: 'Choose another saved fee payer',
      value: 'alternateCachedFeepayer',
    });

  return choices;
}
module.exports = {
  prompts,
};
