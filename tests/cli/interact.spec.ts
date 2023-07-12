import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { generateExampleProject } from '../utils/cli-utils.mjs';
import { Constants } from '../utils/common-utils.mjs';

// TODO:
// - Deployed zkapp interaction (node build/src/interact.js local)
// - Generated project UI interaction (npm run dev)

test.describe('Users', () => {
  // Tests for interaction with example projects of each type
  for (const exampleType of Constants.exampleTypes) {
    test(`should be able to interact with an example zkApp project of ${exampleType.toUpperCase()} type, @parallel @smoke @interaction @${exampleType}`, async () => {
      const { execute, spawn, cleanup, path } = await prepareEnvironment();
      console.info(`[Test Execution] Path: ${path}`);

      try {
        await test.step('Example project generation', async () => {
          await generateExampleProject(exampleType, true, spawn);
        });
        await test.step('Interaction with an example project', async () => {
          const npmRunTestResults = await execute(
            'npm',
            'run test',
            `./${exampleType}`
          );
          expect(npmRunTestResults.code).toBe(0);
          const npmRunBuildResults = await execute(
            'npm',
            'run build',
            `./${exampleType}`
          );
          expect(npmRunBuildResults.code).toBe(0);
          const { code, stdout } = await execute(
            'npm',
            'run start',
            `./${exampleType}`
          );
          expect(code).toBe(0);
          switch (exampleType) {
            case 'sudoku': {
              expect(stdout).toContain('Is the sudoku solved? true');
              break;
            }
            case 'tictactoe': {
              expect(stdout).toContain('did someone win? Player 1!');
              break;
            }
          }
        });
      } finally {
        await cleanup();
      }
    });
  }
});
