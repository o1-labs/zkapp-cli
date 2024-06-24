import { jest } from '@jest/globals';

jest.unstable_mockModule('node:child_process', () => ({
  execSync: jest.fn(),
}));
jest.unstable_mockModule('envinfo', () => ({
  default: {
    run: jest.fn(),
  },
}));

let execSync;
let envinfoRun;

beforeAll(async () => {
  const child_process = await import('node:child_process');
  execSync = child_process.execSync;
  const envinfoModule = await import('envinfo');
  envinfoRun = envinfoModule.default.run;
});

beforeEach(() => {
  jest.clearAllMocks();

  execSync.mockImplementation(() => {
    return JSON.stringify({
      dependencies: {
        o1js: { version: '1.2.3' },
        'zkapp-cli': { version: '4.5.6' },
      },
    });
  });

  envinfoRun.mockResolvedValue(`
    System:
      OS: myOs
      CPU: myCPU @ 42.00GHz
    Binaries:
      Node: 0.0.0 - /usr/local/bin/node
      npm: 0.0.0 - /usr/local/bin/npm
      Yarn: 0.0.0 - /usr/local/bin/yarn
    npmPackages:
      o1js: Not Found
    npmGlobalPackages:
      zkapp-cli: Not Found
  `);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('system()', () => {
  it('should log system information with package versions', async () => {
    const { default: system } = await import('./system.js');
    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {});

    await system();

    const logOutput = consoleLogSpy.mock.calls
      .flatMap((call) => call)
      .join('\n');
    expect(logOutput).toContain(
      'Be sure to include the following system information when submitting a GitHub issue:'
    );
    expect(logOutput).toContain('o1js: 1.2.3');
    expect(logOutput).toContain('zkapp-cli: 4.5.6');
  });

  it('should correctly handle missing packages', async () => {
    execSync.mockImplementation(() => JSON.stringify({ dependencies: {} }));

    const { default: system } = await import('./system.js');
    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {});

    await system();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not Found')
    );
  });
});

describe('getInstalledNpmPackageVersion()', () => {
  it('should handle defaults', async () => {
    const { getInstalledNpmPackageVersion } = await import('./system.js');
    getInstalledNpmPackageVersion();
    expect(execSync).toHaveBeenCalledWith('npm list  --all --depth 0 --json', {
      encoding: 'utf-8',
    });
  });

  it('should return the correct version of a local npm package', async () => {
    const { getInstalledNpmPackageVersion } = await import('./system.js');
    const version = getInstalledNpmPackageVersion({ packageName: 'o1js' });

    expect(execSync).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenCalledWith('npm list  --all --depth 0 --json', {
      encoding: 'utf-8',
    });
    expect(version).toBe('1.2.3');
  });

  it('should return the correct version of a global npm package', async () => {
    const { getInstalledNpmPackageVersion } = await import('./system.js');
    const version = getInstalledNpmPackageVersion({
      packageName: 'zkapp-cli',
      isGlobal: true,
    });

    expect(execSync).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenCalledWith(
      'npm list -g --all --depth 0 --json',
      {
        encoding: 'utf-8',
      }
    );
    expect(version).toBe('4.5.6');
  });

  it('should return undefined if the package is not found', async () => {
    execSync.mockReturnValueOnce(JSON.stringify({ dependencies: {} }));
    const { getInstalledNpmPackageVersion } = await import('./system.js');
    const version = getInstalledNpmPackageVersion({
      packageName: 'non-existent-package',
    });

    expect(execSync).toHaveBeenCalledTimes(1);
    expect(version).toBeUndefined();
  });

  it('should return undefined for an unexpected error', async () => {
    execSync.mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const { getInstalledNpmPackageVersion } = await import('./system.js');
    const version = getInstalledNpmPackageVersion({ packageName: 'o1js' });

    expect(execSync).toHaveBeenCalledTimes(1);
    expect(version).toBeUndefined();
  });

  it('should return undefined if no dependencies are present in the package list', async () => {
    execSync.mockReturnValueOnce(JSON.stringify({}));
    const { getInstalledNpmPackageVersion } = await import('./system.js');
    const version = getInstalledNpmPackageVersion({
      packageName: 'missing-package',
    });

    expect(version).toBeUndefined();
  });
});
