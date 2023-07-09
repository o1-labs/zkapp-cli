import { expect } from '@playwright/test';

export function checkCommandSuccessfulExecution(exitCode, stdErr) {
  expect(exitCode).toBe(0);
  expect(stdErr).toHaveLength(0);
}

export function checkSuccessfulProjectGeneration(exitCode, stdOut) {
  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  // TODO: Add project generation validation.
}
