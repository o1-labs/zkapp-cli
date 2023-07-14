import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import crypto from 'node:crypto';
import os from 'node:os';
import { generateProject } from '../utils/cli-utils.mjs';
import { Constants, getArrayValuesAsString } from '../utils/common-utils.mjs';
import { checkProjectGenerationResults } from '../utils/validation-utils.mjs';

test.describe('zkApp-CLI', () => {
  test(`should not generate zkApp project for unknown UI type, @parallel @smoke @project @fail-cases`, async () => {
    const cliArg = 'project --ui test deploy-me';
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);
    try {
      const { code, stderr } = await execute('zk', cliArg);
      console.info(`[CLI StdErr] zk ${cliArg}: ${JSON.stringify(stderr)}`);

      expect(code).toBeGreaterThan(0);
      expect(stderr.at(-1)).toContain(
        `ui was "test". Must be one of: ${getArrayValuesAsString(
          Constants.uiTypes
        )}.`
      );
    } finally {
      await cleanup();
    }
  });

  // Tests for project generation of each UI type
  for (const uiType of Constants.uiTypes) {
    test(`should generate zkApp project with ${uiType.toUpperCase()} UI type, @parallel @smoke @project @${uiType}-ui`, async () => {
      test.skip(
        os.platform() === 'win32' && uiType === 'svelte',
        'Disabling interactive zkApp project generation for Svelte UI type on Windows platform due to: ERR_TTY_INIT_FAILED on CI'
      );

      for (const skipInteractiveSelection of Constants.skipInteractiveSelectionOptions) {
        await test.step(`Project generation and results validation ("skipInteractiveSelection=${skipInteractiveSelection}")`, async () => {
          const projectName = crypto.randomUUID();
          const { spawn, cleanup, path, ls, exists } =
            await prepareEnvironment();
          console.info(`[Test Execution] Path: ${path}`);

          try {
            const { exitCode, stdOut } = await generateProject(
              projectName,
              uiType,
              skipInteractiveSelection,
              spawn
            );
            await checkProjectGenerationResults(
              projectName,
              uiType,
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
