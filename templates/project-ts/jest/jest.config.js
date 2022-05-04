/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  rootDir: '../',
  verbose: true,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {
    '^.+\\.(t)s$': 'ts-jest',
    '^.+\\.(j)s$': ['babel-jest', { configFile: './jest/babel.config.cjs' }],
  },
  resolver: '<rootDir>/jest/jest.import-resolver.cjs',
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!snarkyjs/node_modules/tslib)',
  ],
};
