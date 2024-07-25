import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: jest.fn((text) => `blue: ${text}`),
    yellow: jest.fn((text) => `yellow: ${text}`),
    green: jest.fn((text) => `green: ${text}`),
    red: jest.fn((text) => `red: ${text}`),
    gray: jest.fn((text) => `gray: ${text}`),
    bold: jest.fn((text) => `bold: ${text}`),
  },
}));

let formatPrefixSymbol,
  getFeepayorChoices,
  sanitizeAliasName,
  sanitizeCustomNetworkId;

beforeAll(async () => {
  const prompts = await import('./prompts.js');
  formatPrefixSymbol = prompts.formatPrefixSymbol;
  getFeepayorChoices = prompts.getFeepayorChoices;
  sanitizeAliasName = prompts.sanitizeAliasName;
  sanitizeCustomNetworkId = prompts.sanitizeCustomNetworkId;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('prompts.js', () => {
  describe('formatPrefixSymbol()', () => {
    it('should return a cyan question mark when not submitted', () => {
      const state = { submitted: false, symbols: { question: '?' } };
      expect(formatPrefixSymbol(state)).toBe(state.symbols.question);
    });

    it('should return a green check mark when submitted', () => {
      const state = {
        submitted: true,
        cancelled: false,
        symbols: { check: '✔' },
      };
      expect(formatPrefixSymbol(state)).toEqual(expect.stringContaining('✔'));
    });

    it('should return a red "x" when cancelled', () => {
      const state = {
        submitted: true,
        cancelled: true,
        symbols: { cross: '✘' },
      };
      expect(formatPrefixSymbol(state)).toEqual(expect.stringContaining('✘'));
    });
  });

  describe('getFeepayorChoices()', () => {
    it('should return choices for recovering and creating a fee payer', () => {
      const cachedFeepayerAliases = [];
      const choices = getFeepayorChoices(cachedFeepayerAliases);
      expect(choices).toEqual([
        {
          name: 'Recover fee payer account from an existing base58 private key',
          value: 'recover',
        },
        {
          name: `Create a new fee payer key pair
  NOTE: The private key is created on this computer and is stored in plain text.`,
          value: 'create',
        },
      ]);
    });

    it('should include an option to choose another saved fee payer if more than one is cached', () => {
      const cachedFeepayerAliases = ['alias1', 'alias2'];
      const choices = getFeepayorChoices(cachedFeepayerAliases);
      expect(choices).toContainEqual({
        name: 'Choose another saved fee payer',
        value: 'alternateCachedFeepayer',
      });
    });
  });

  describe('sanitizeAliasName()', () => {
    it('should convert alias name to lowercase and replace spaces with dashes', () => {
      const aliasName = 'Test Alias Name';
      const sanitized = sanitizeAliasName(aliasName);
      expect(sanitized).toBe('test-alias-name');
    });

    it('should trim whitespace from the alias name', () => {
      const aliasName = '  Test Alias Name  ';
      const sanitized = sanitizeAliasName(aliasName);
      expect(sanitized).toBe('test-alias-name');
    });
  });

  describe('sanitizeCustomNetworkId()', () => {
    it('should replace spaces with dashes', () => {
      const networkId = 'custom network id';
      const sanitized = sanitizeCustomNetworkId(networkId);
      expect(sanitized).toBe('custom-network-id');
    });

    it('should trim whitespace from the network id', () => {
      const networkId = '  custom network id  ';
      const sanitized = sanitizeCustomNetworkId(networkId);
      expect(sanitized).toBe('custom-network-id');
    });
  });
});
