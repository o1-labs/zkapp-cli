import { prepareEnvironment } from '@gmrchk/cli-testing-library';
import { expect, test } from '@playwright/test';

test.describe('zkApp-CLI', () => {
  test('should return version information, @smoke @cli', async () => {
    const versionRegex = /^\d+\.\d+\.\d+$/i;
    const { execute, cleanup } = await prepareEnvironment();

    for (const cliArg of ['-v', '--version']) {
      await test.step(`Checking the "${cliArg}" case`, async () => {
        const { code, stdout, stderr } = await execute('zk', cliArg);
        const targetCliOutput = stdout.at(-1);

        console.info(`[CLI Output] zk ${cliArg}: ${targetCliOutput}`);

        expect(code).toBe(0);
        expect(targetCliOutput).toMatch(versionRegex);
        expect(stderr).toHaveLength(0);
      });
    }

    await cleanup();
  });
});
