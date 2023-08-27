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
  processHandler: CLITestEnvironment['spawn']
): Promise<CommandResults> {
  const cliArgs = skipInteractiveSelection ? `--ui ${uiType}` : '';
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
    case 'svelte': {
      interactiveDialog = {
        ...interactiveDialog,
        'Which Svelte app template?': ['arrowDown', 'enter'],
        'Add type checking with TypeScript?': ['arrowDown', 'enter'],
        'Select additional options (use arrow keys/space bar)': [
          'space',
          'arrowDown',
          'space',
          'arrowDown',
          'space',
          'arrowDown',
          'space',
          'enter',
        ],
      };
      break;
    }
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
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  const contractsPath = `./${projectName}/contracts`;
  const uiPath = `./${projectName}/ui`;

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  expect(await existsOnFilesystemFn(`./${projectName}`)).toBe(true);
  expect(await existsOnFilesystemFn(`${projectName}/.git`)).toBe(true);
  expect((await listFilesystemFn(`./${projectName}`)).length).toBeGreaterThan(
    0
  );
  expect(
    (await listFilesystemFn(`./${projectName}/.git`)).length
  ).toBeGreaterThan(0);

  switch (uiType) {
    case 'next':
    case 'svelte':
    case 'nuxt': {
      await checkSmartContractsFilesystem(
        contractsPath,
        true,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      await checkUiFilesystem(uiPath, listFilesystemFn, existsOnFilesystemFn);
      break;
    }
    case 'empty': {
      await checkSmartContractsFilesystem(
        contractsPath,
        true,
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
        true,
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
