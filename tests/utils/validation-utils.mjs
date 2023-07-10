import { expect } from '@playwright/test';

async function checkGeneratedSmartContractsFilesystem(
  path,
  listFilesystemFn,
  existsOnFilesystemFn
) {
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  expect(await existsOnFilesystemFn(`${path}/keys`)).toBe(true);
  expect(await existsOnFilesystemFn(`${path}/config.json`)).toBe(true);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

async function checkGeneratedUiFilesystem(
  path,
  listFilesystemFn,
  existsOnFilesystemFn
) {
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

export function checkCommandExecutionResults(exitCode, stdErr) {
  expect(exitCode).toBe(0);
  expect(stdErr).toHaveLength(0);
}

export async function checkProjectGenerationResults(
  projectName,
  uiType,
  stdOut,
  exitCode,
  listFilesystemFn,
  existsOnFilesystemFn
) {
  const contractsPath = `./${projectName}/contracts`;
  const uiPath = `./${projectName}/ui`;

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');

  expect(await existsOnFilesystemFn(`${projectName}`)).toBe(true);
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
      await checkGeneratedSmartContractsFilesystem(
        contractsPath,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      await checkGeneratedUiFilesystem(
        uiPath,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      break;
    }
    case 'empty': {
      await checkGeneratedSmartContractsFilesystem(
        contractsPath,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(true);
      expect((await listFilesystemFn(uiPath)).length).toBe(0);
      break;
    }
    case 'none': {
      await checkGeneratedSmartContractsFilesystem(
        `./${projectName}`,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(false);
      break;
    }
  }
}
