import { test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import crypto from 'node:crypto';
import { generateProject } from '../utils/cli-utils.mjs';
import { Constants } from '../utils/common-utils.mjs';
import { checkSuccessfulProjectGeneration } from '../utils/validation-utils.mjs';

test.describe('zkApp-CLI', () => {
  for (const uiType of Constants.uiTypes) {
    test(`should generate ${uiType.toUpperCase()} zkApp project, @smoke @project @${uiType}-ui`, async () => {
      for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
        await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
          const projectName = crypto.randomUUID();
          const { spawn, cleanup, path } = await prepareEnvironment();
          console.info(`[Test Execution] Path: ${path}`);

          try {
            let { exitCode, stdOut } = await generateProject(
              projectName,
              uiType,
              skipUiTypeSelection,
              spawn
            );
            checkSuccessfulProjectGeneration(exitCode, stdOut);
          } finally {
            await cleanup();
          }
        });
      }
    });
  }
});
