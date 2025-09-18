import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import crypto from 'node:crypto';
import os from 'node:os';
import Constants from '../../src/lib/constants.js';
import {
  TestConstants,
  getArrayValuesAsString,
  removeEnvCustomLoaders,
} from '../utils/common-utils.js';
import { checkZkProject, zkProject } from '../utils/project-utils.js';

test.describe('zkApp-CLI', () => {
  test.beforeAll(removeEnvCustomLoaders);

  test(`should not generate zkApp project for unknown UI type, @parallel @smoke @project @fail-cases`, async () => {
    const cliArg = 'project --ui test deploy-me';
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { code, stderr } = await execute('zk', cliArg);
      console.info(`[CLI StdErr] zk ${cliArg}: ${JSON.stringify(stderr)}`);

      expect(code).toBeGreaterThan(0);
      expect(stderr.at(-1)).toContain(
        `Argument: ui, Given: "test", Choices: ${getArrayValuesAsString(
          Constants.uiTypes
        )}`
      );
    } finally {
      await cleanup();
    }
  });

  // Tests for project generation of each UI type
  for (const uiType of Constants.uiTypes) {
    test(`should generate zkApp project with ${uiType.toUpperCase()} UI type, @parallel @smoke @project @${uiType}-ui`, async () => {
      test.skip(
        os.platform() === 'win32' && uiType === 'nuxt',
        'Skipping tests in certain conditions.'
      );

      for (const skipInteractiveSelection of TestConstants.skipInteractiveSelectionOptions) {
        await test.step(`Project generation and results validation skipInteractiveSelection=${skipInteractiveSelection})`, async () => {
          const projectName = crypto.randomUUID();
          const { spawn, cleanup, path, ls, exists } =
            await prepareEnvironment();
          console.info(`[Test Execution] Path: ${path}`);

          try {
            const { exitCode, stdOut } = await zkProject(
              projectName,
              uiType,
              skipInteractiveSelection,
              spawn
            );
            await checkZkProject(
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

  // Tests for Zeko L2 project generation
  test(`should generate Zeko L2 zkApp project (devnet default), @parallel @smoke @project @zeko`, async () => {
    const projectName = crypto.randomUUID();
    const { spawn, cleanup, path, ls, exists } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { exitCode, stdOut } = await zkProject(
        projectName,
        'none',
        true,
        spawn,
        true, // isZeko
        'devnet' // network
      );
      await checkZkProject(
        projectName,
        'none',
        stdOut,
        exitCode,
        ls,
        exists,
        true, // isZeko
        'devnet' // network
      );
    } finally {
      await cleanup();
    }
  });

  test(`should generate Zeko L2 zkApp project with UI, @parallel @smoke @project @zeko @next-ui`, async () => {
    const projectName = crypto.randomUUID();
    const { spawn, cleanup, path, ls, exists } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { exitCode, stdOut } = await zkProject(
        projectName,
        'next',
        true,
        spawn,
        true, // isZeko
        'devnet' // network
      );
      await checkZkProject(
        projectName,
        'next',
        stdOut,
        exitCode,
        ls,
        exists,
        true, // isZeko
        'devnet' // network
      );
    } finally {
      await cleanup();
    }
  });

  test(`should generate Zeko L2 zkApp project with mainnet network, @parallel @smoke @project @zeko`, async () => {
    const projectName = crypto.randomUUID();
    const { spawn, cleanup, path, ls, exists } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { exitCode, stdOut } = await zkProject(
        projectName,
        'none',
        true,
        spawn,
        true, // isZeko
        'mainnet' // network
      );
      await checkZkProject(
        projectName,
        'none',
        stdOut,
        exitCode,
        ls,
        exists,
        true, // isZeko
        'mainnet' // network
      );
    } finally {
      await cleanup();
    }
  });
});
