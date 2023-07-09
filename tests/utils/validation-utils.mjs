import { expect } from '@playwright/test';

export function checkCommandExecutionResults(exitCode, stdErr) {
  expect(exitCode).toBe(0);
  expect(stdErr).toHaveLength(0);
}

export function checkProjectGenerationResults(exitCode, stdOut) {
  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  // TODO: Add project generation validation.
}
