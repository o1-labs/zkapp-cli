import { test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import crypto from 'node:crypto';
import { generateProject } from '../utils/cli-utils.mjs';
import { Constants } from '../utils/common-utils.mjs';
import { checkSuccessfulProjectGeneration } from '../utils/validation-utils.mjs';

test.describe('zkApp-CLI', () => {
  // We use almost identical blocks of code for each test case because we don't want to fail the "fat" test
  // in case if some particular UI framework has issues. Example: https://github.com/o1-labs/zkapp-cli/issues/449.
  // Sometimes configuration becomes outdated.

  test('should generate NextJS zkApp project, @smoke @project @next-ui', async () => {
    for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
      await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
        const projectName = crypto.randomUUID();
        const { spawn, cleanup, path } = await prepareEnvironment();
        console.info(`[Test Execution] Path: ${path}`);

        try {
          let { exitCode, stdOut } = await generateProject(
            projectName,
            'next',
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

  test('should generate Svelte zkApp project, @smoke @project @svelte-ui', async () => {
    for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
      await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
        const projectName = crypto.randomUUID();
        const { spawn, cleanup, path } = await prepareEnvironment();
        console.info(`[Test Execution] Path: ${path}`);

        try {
          let { exitCode, stdOut } = await generateProject(
            projectName,
            'svelte',
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

  test('should generate Nuxt zkApp project, @smoke @project @nuxt-ui', async () => {
    for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
      await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
        const projectName = crypto.randomUUID();
        const { spawn, cleanup, path } = await prepareEnvironment();
        console.info(`[Test Execution] Path: ${path}`);

        try {
          let { exitCode, stdOut } = await generateProject(
            projectName,
            'nuxt',
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

  test('should generate zkApp project with empty UI, @smoke @project @empty-ui', async () => {
    for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
      await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
        const projectName = crypto.randomUUID();
        const { spawn, cleanup, path } = await prepareEnvironment();
        console.info(`[Test Execution] Path: ${path}`);

        try {
          let { exitCode, stdOut } = await generateProject(
            projectName,
            'empty',
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

  test('should generate zkApp project without UI, @smoke @project @no-ui', async () => {
    for (const skipUiTypeSelection of Constants.skipUiTypeSelectionOptions) {
      await test.step(`Project generation and results validation ("skipUiTypeSelection=${skipUiTypeSelection}")`, async () => {
        const projectName = crypto.randomUUID();
        const { spawn, cleanup, path } = await prepareEnvironment();
        console.info(`[Test Execution] Path: ${path}`);

        try {
          let { exitCode, stdOut } = await generateProject(
            projectName,
            'none',
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
});
