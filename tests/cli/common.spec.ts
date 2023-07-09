import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { checkCommandSuccessfulExecution } from '../utils/validation-utils.mjs';

test.describe('zkApp-CLI', () => {
  test('should return version information, @smoke @version', async () => {
    const versionRegex = /^\d+\.\d+\.\d+$/i;
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    for (const cliArg of ['-v', '--version']) {
      await test.step(`Checking the "${cliArg}" case`, async () => {
        const { code, stdout, stderr } = await execute('zk', cliArg);
        const targetCliOutput = stdout.at(-1);
        console.info(`[CLI StdOut] zk ${cliArg}: ${targetCliOutput}`);

        checkCommandSuccessfulExecution(code, stderr);
        expect(targetCliOutput).toMatch(versionRegex);
        expect(stdout).toHaveLength(1);
      });
    }

    await cleanup();
  });
});
