import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import { removeEnvCustomLoaders } from '../utils/common-utils.js';

test.describe('zkApp-CLI', () => {
  test.beforeAll(removeEnvCustomLoaders);

  test('should return version information, @parallel @smoke @version', async () => {
    const versionRegex = /^\d+\.\d+\.\d+$/i;
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      for (const cliArg of ['-v', '--version']) {
        await test.step(`Checking the "${cliArg}" case`, async () => {
          const { code, stdout, stderr } = await execute('zk', cliArg);
          const targetCliOutput = stdout.at(-1);
          console.info(`[CLI StdOut] zk ${cliArg}: ${targetCliOutput}`);

          checkCommandExecutionResults(code, stderr);
          expect(targetCliOutput).toMatch(versionRegex);
          expect(stdout).toHaveLength(1);
        });
      }
    } finally {
      await cleanup();
    }
  });
});

function checkCommandExecutionResults(
  exitCode: ExitCode | null,
  stdErr: string[]
): void {
  expect(exitCode).toBe(0);
  expect(stdErr).toHaveLength(0);
}
