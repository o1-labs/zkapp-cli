import { expect } from '@playwright/test';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types';
import Constants from '../../src/lib/constants.js';
import { CommandResults, UiType } from '../models/types.js';
import {
  executeInteractiveCommand,
  generateInputsForOptionSelection,
} from './cli-utils.js';
import {
  checkSmartContractsFilesystem,
  getBooleanFromString,
} from './common-utils.js';

export async function zkProject(
  projectName: string,
  uiType: UiType,
  skipInteractiveSelection: boolean,
  processHandler: CLITestEnvironment['spawn'],
  isZeko?: boolean,
  network?: string
): Promise<CommandResults> {
  let cliArgs = skipInteractiveSelection ? `--ui ${uiType}` : '';
  if (isZeko) {
    cliArgs += ' --zeko';
    if (network && network !== 'devnet') {
      cliArgs += ` --network ${network}`;
    }
  }
  const command = `project ${cliArgs} ${projectName}`.replace(/\s{2,}/g, ' ');
  let interactiveDialog = {};

  if (!skipInteractiveSelection) {
    interactiveDialog = {
      ...interactiveDialog,
      'Create an accompanying UI project too?':
        generateInputsForOptionSelection(uiType, Constants.uiTypes),
    };
  }

  switch (uiType) {
    case 'next': {
      if (!getBooleanFromString(process.env.CI)) {
        // TODO: https://github.com/o1-labs/zkapp-cli/issues/453
        process.env.CI = 'true';
      }
      interactiveDialog = {
        ...interactiveDialog,
        'Do you want to set up your project for deployment to GitHub Pages?': [
          'enter',
        ],
      };
      break;
    }
    // We are going to skip the interactive dialog for Svelte UI type because of latest `sv` application issues when spawn from other processes.
    // case 'svelte': {
    //   interactiveDialog = {
    //     ...interactiveDialog,
    //     'Which template would you like?': ['enter'],
    //     'Add type checking with Typescript?': ['enter'],
    //     'What would you like to add to your project?': [
    //       'space',
    //       'arrowDown',
    //       'space',
    //       'arrowDown',
    //       'space',
    //       'arrowDown',
    //       'space',
    //       'enter',
    //     ],
    //     'Which package manager do you want to install dependencies with?': [
    //       'enter',
    //     ],
    //   };
    //   break;
    // }
  }

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom: undefined,
    waitForCompletion: true,
    interactiveDialog,
  });

  console.info(`[Project CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Project CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function checkZkProject(
  projectName: string,
  uiType: UiType,
  stdOut: string[],
  exitCode: ExitCode | null,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists'],
  isZeko?: boolean,
  network?: string
): Promise<void> {
  const contractsPath = isZeko
    ? `./${projectName}/contracts`
    : `./${projectName}/contracts`;
  const uiPath = `./${projectName}/ui`;
  const projectPath = isZeko ? `./${projectName}` : `./${projectName}`;

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  expect(await existsOnFilesystemFn(projectPath)).toBe(true);
  expect(await existsOnFilesystemFn(`${projectName}/.git`)).toBe(true);
  expect((await listFilesystemFn(projectPath)).length).toBeGreaterThan(0);
  expect(
    (await listFilesystemFn(`./${projectName}/.git`)).length
  ).toBeGreaterThan(0);

  // Verify Zeko-specific files and configuration
  if (isZeko) {
    await checkZekoProjectSpecific(
      projectName,
      network || 'devnet',
      listFilesystemFn,
      existsOnFilesystemFn
    );
  }

  switch (uiType) {
    case 'next':
    case 'svelte':
    case 'nuxt': {
      await checkSmartContractsFilesystem(
        contractsPath,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      await checkUiFilesystem(uiPath, listFilesystemFn, existsOnFilesystemFn);
      break;
    }
    case 'empty': {
      await checkSmartContractsFilesystem(
        contractsPath,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(true);
      expect((await listFilesystemFn(uiPath)).length).toBe(0);
      break;
    }
    case 'none': {
      await checkSmartContractsFilesystem(
        `./${projectName}`,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(false);
      break;
    }
  }
}

async function checkUiFilesystem(
  path: string,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

async function checkZekoProjectSpecific(
  projectName: string,
  network: string,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  const fs = await import('node:fs');

  // Check that README contains Zeko branding
  const readmePath = `./${projectName}/README.md`;
  expect(await existsOnFilesystemFn(readmePath)).toBe(true);
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  expect(readmeContent).toContain('Zeko L2');

  // Check that config.json has Zeko endpoints
  const configPath = `./${projectName}/config.json`;
  expect(await existsOnFilesystemFn(configPath)).toBe(true);
  const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const deployAlias = `zeko-${network}`;
  expect(configContent.deployAliases[deployAlias]).toBeDefined();
  expect(configContent.deployAliases[deployAlias].url).toContain('zeko.io');

  // Check that bridge example exists
  const bridgePath = `./${projectName}/src/bridge-example.ts`;
  expect(await existsOnFilesystemFn(bridgePath)).toBe(true);
  const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
  expect(bridgeContent).toContain('Zeko L2 Bridge');
  expect(bridgeContent).toContain('zeko.io/graphql');
}
