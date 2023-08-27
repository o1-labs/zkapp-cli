import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import Constants from '../../src/lib/constants.js';
import {
  TestConstants,
  getArrayValuesAsString,
  removeEnvCustomLoaders,
} from '../utils/common-utils.js';
import { checkZkExample, zkExample } from '../utils/example-utils.js';

test.describe('zkApp-CLI', () => {
  test.beforeAll(removeEnvCustomLoaders);

  test(`should not generate zkApp project for unknown example type, @parallel @smoke @example @fail-cases`, async () => {
    const cliArg = 'example --name test';
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { code, stderr } = await execute('zk', cliArg);
      console.info(`[CLI StdErr] zk ${cliArg}: ${JSON.stringify(stderr)}`);

      expect(code).toBeGreaterThan(0);
      expect(stderr.at(-1)).toContain(
        `name was "test". Must be one of: ${getArrayValuesAsString(
          Constants.exampleTypes
        )}.`
      );
    } finally {
      await cleanup();
    }
  });

  // Tests for example projects generation of each type
  for (const exampleType of Constants.exampleTypes) {
    test(`should generate an example zkApp project of ${exampleType.toUpperCase()} type, @parallel @smoke @example @${exampleType}`, async () => {
      for (const skipInteractiveSelection of TestConstants.skipInteractiveSelectionOptions) {
        await test.step(`Example project generation and results validation (skipInteractiveSelection=${skipInteractiveSelection})`, async () => {
          const { spawn, cleanup, path, ls, exists } =
            await prepareEnvironment();
          console.info(`[Test Execution] Path: ${path}`);

          try {
            const { exitCode, stdOut } = await zkExample(
              exampleType,
              skipInteractiveSelection,
              spawn
            );
            await checkZkExample(exampleType, stdOut, exitCode, ls, exists);
          } finally {
            await cleanup();
          }
        });
      }
    });
  }
});
