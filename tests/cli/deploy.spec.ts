import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import crypto from 'node:crypto';
import Constants from '../../src/lib/constants.js';
import { removeEnvCustomLoaders } from '../utils/common-utils.js';
import { checkZkDeploy, zkDeploy } from '../utils/deploy-utils.js';
import { getMempoolTxns } from '../utils/network-utils.js';
import { zkProject } from '../utils/project-utils.js';

test.describe('zkApp-CLI', () => {
  test.beforeAll(removeEnvCustomLoaders);

  test(`should not deploy zkApp if not within the project dir, @parallel @smoke @deployment @fail-cases`, async () => {
    const cliArg = 'deploy local';
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      const { stdout } = await execute('zk', cliArg);
      console.info(`[CLI StdOut] zk ${cliArg}: ${JSON.stringify(stdout)}`);

      // TODO: https://github.com/o1-labs/zkapp-cli/issues/454
      // expect(code).toBeGreaterThan(0);
      expect(stdout.at(-1)).toContain(
        "config.json not found. Make sure you're in a zkApp project directory."
      );
    } finally {
      await cleanup();
    }
  });

  test(`should not deploy zkApp if no deployment alias found, @parallel @smoke @deployment @fail-cases`, async () => {
    const projectName = crypto.randomUUID();
    const { spawn, execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation', async () => {
        await zkProject(projectName, 'none', true, spawn);
      });
      await test.step('ZkApp deployment failure attempt (no aliases provided)', async () => {
        const cliArg = 'deploy';
        const { code, stdout } = await execute(
          'zk',
          cliArg,
          `./${projectName}`
        );
        console.info(`[CLI StdOut] zk ${cliArg}: ${JSON.stringify(stdout)}`);

        expect(code).toBe(0);
        expect(stdout).toContain('No deploy aliases found in config.json.');
      });
      await test.step('ZkApp deployment failure attempt (unknown alias provided)', async () => {
        const cliArg = `deploy ${crypto.randomUUID()}`;
        const { code, stdout } = await execute(
          'zk',
          cliArg,
          `./${projectName}`
        );
        console.info(`[CLI StdOut] zk ${cliArg}: ${JSON.stringify(stdout)}`);

        expect(code).toBe(0);
        expect(stdout).toContain('Deploy alias name not found in config.json.');
      });
    } finally {
      await cleanup();
    }
  });

  test(`should not deploy zkApp if aborted, @serial @smoke @deployment`, async () => {
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('ZkApp project generation, configuration and deployment cancellation', async () => {
        const mempoolTxns = await getMempoolTxns();
        const { exitCode, stdOut } = await zkDeploy(
          path,
          'none',
          true,
          spawn,
          true
        );

        expect(exitCode).toBeGreaterThan(0);
        expect(stdOut).toContain('Aborted. Transaction not sent.');
        expect(await getMempoolTxns()).toEqual(mempoolTxns);
      });
    } finally {
      await cleanup();
    }
  });

  test(`should deploy zkApp of generated project, @parallel @smoke @deployment`, async () => {
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('ZkApp project generation, configuration, deployment (interactive mode) and results validation', async () => {
        const { zkAppPublicKey, exitCode, stdOut } = await zkDeploy(
          path,
          'none',
          true,
          spawn,
          false
        );
        await checkZkDeploy(zkAppPublicKey, exitCode, stdOut);
      });
      await test.step('ZkApp project generation, configuration, deployment (non-interactive mode) and results validation', async () => {
        const { zkAppPublicKey, exitCode, stdOut } = await zkDeploy(
          path,
          'next', // Can't do Svelte on Windows, see Project generation tests for more info.
          false,
          spawn,
          false
        );
        await checkZkDeploy(zkAppPublicKey, exitCode, stdOut);
      });
    } finally {
      await cleanup();
    }
  });

  test(`should deploy zkApps of example projects, @parallel @smoke @deployment`, async () => {
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      for (const exampleType of Constants.exampleTypes) {
        await test.step(`Example zkApp project generation (${exampleType.toUpperCase()}), configuration, deployment and results validation`, async () => {
          const { zkAppPublicKey, exitCode, stdOut } = await zkDeploy(
            path,
            exampleType,
            false,
            spawn,
            false
          );
          await checkZkDeploy(zkAppPublicKey, exitCode, stdOut);
        });
      }
    } finally {
      await cleanup();
    }
  });
});
