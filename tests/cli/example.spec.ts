import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { generateExampleProject } from '../utils/cli-utils.mjs';
import { Constants, getArrayValuesAsString } from '../utils/common-utils.mjs';
import { checkExampleProjectGenerationResults } from '../utils/validation-utils.mjs';

test.describe('zkApp-CLI', () => {
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
      for (const skipInteractiveSelection of Constants.skipInteractiveSelectionOptions) {
        await test.step(`Example project generation and results validation (skipInteractiveSelection=${skipInteractiveSelection})`, async () => {
          const { spawn, cleanup, path, ls, exists } =
            await prepareEnvironment();
          console.info(`[Test Execution] Path: ${path}`);

          try {
            const { exitCode, stdOut } = await generateExampleProject(
              exampleType,
              skipInteractiveSelection,
              spawn
            );
            await checkExampleProjectGenerationResults(
              exampleType,
              stdOut,
              exitCode,
              ls,
              exists
            );
          } finally {
            await cleanup();
          }
        });
      }
    });
  }
});
