import { expect } from '@playwright/test';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types';
import Constants from '../../src/lib/constants.js';
import { CommandResults, ExampleType } from '../models/types.js';
import {
  executeInteractiveCommand,
  generateInputsForOptionSelection,
} from './cli-utils.js';
import { checkSmartContractsFilesystem } from './common-utils.js';

export async function zkExample(
  exampleType: ExampleType,
  skipInteractiveSelection: boolean,
  processHandler: CLITestEnvironment['spawn']
): Promise<CommandResults> {
  const cliArgs = skipInteractiveSelection ? `--name ${exampleType}` : '';
  const command = `example ${cliArgs}`.replace(/\s{2,}/g, ' ');
  let interactiveDialog = {};

  if (!skipInteractiveSelection) {
    interactiveDialog = {
      ...interactiveDialog,
      'Choose an example': generateInputsForOptionSelection(
        exampleType,
        Constants.exampleTypes
      ),
    };
  }

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom: undefined,
    waitForCompletion: true,
    interactiveDialog,
  });

  console.info(`[Example CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Example CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function checkZkExample(
  exampleType: ExampleType,
  stdOut: string[],
  exitCode: ExitCode | null,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  const path = `./${exampleType}`;
  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  await checkSmartContractsFilesystem(
    path,
    listFilesystemFn,
    existsOnFilesystemFn
  );
  expect(await existsOnFilesystemFn(`${path}/.git`)).toBe(true);
  expect((await listFilesystemFn(`${path}/.git`)).length).toBeGreaterThan(0);
}
