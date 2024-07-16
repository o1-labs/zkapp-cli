import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => {
  const createChainedMock = (color) => {
    const mockFn = jest.fn((text) => `${color}: ${text}`);
    mockFn.bold = jest.fn((text) => `bold ${color}: ${text}`);
    mockFn.green = jest.fn((text) => `green ${color}: ${text}`);
    mockFn.green.bold = jest.fn((text) => `green bold ${color}: ${text}`);
    return mockFn;
  };

  return {
    default: {
      reset: createChainedMock('reset'),
      green: createChainedMock('green'),
      bold: createChainedMock('bold'),
      yellow: createChainedMock('yellow'),
      red: createChainedMock('red'),
      dim: createChainedMock('dim'),
    },
  };
});

jest.unstable_mockModule('debug', () => ({
  default: () => jest.fn(),
}));

jest.unstable_mockModule('decompress', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('enquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    ensureDirSync: jest.fn(),
    existsSync: jest.fn(),
    outputJsonSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    readJSONSync: jest.fn(),
    removeSync: jest.fn(),
    statSync: jest.fn(),
    writeFileSync: jest.fn(),
    writeJSONSync: jest.fn(),
    moveSync: jest.fn(),
  },
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readdirSync: jest.fn(),
  },
}));

jest.unstable_mockModule('opener', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('ora', () => ({
  default: () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.unstable_mockModule('shelljs', () => ({
  default: {
    which: jest.fn(),
    exec: jest.fn((command, options, callback) => {
      if (typeof options === 'function') callback = options;
      if (callback) callback(0, 'stdout', 'stderr');
    }),
    exit: jest.fn(),
    pwd: jest.fn().mockReturnValue({ toString: () => '/current/dir' }),
  },
}));

jest.unstable_mockModule('table', () => ({
  getBorderCharacters: jest.fn(() => 'border-characters'),
  table: jest.fn(
    (data, config) => `table: ${JSON.stringify(data)} ${JSON.stringify(config)}`
  ),
}));

jest.unstable_mockModule('./network-helpers.js', () => ({
  checkLocalPortsAvailability: jest.fn(),
}));

let fs,
  nodeFs,
  path,
  Constants,
  enquirer,
  table,
  decompress,
  opener,
  networkHelpers,
  shell,
  lightnetConfigFile,
  lightnetLogsDir,
  lightnetExplorerDir,
  lightnetExplorerConfigFile,
  secondsToHms;

beforeAll(async () => {
  fs = (await import('fs-extra')).default;
  nodeFs = (await import('node:fs')).default;
  enquirer = (await import('enquirer')).default;
  table = await import('table');
  decompress = (await import('decompress')).default;
  opener = (await import('opener')).default;
  shell = (await import('shelljs')).default;
  Constants = (await import('./constants.js')).default;
  path = (await import('node:path')).default;
  networkHelpers = await import('./network-helpers.js');
  secondsToHms = (await import('./lightnet.js')).secondsToHms;

  lightnetConfigFile = path.resolve(Constants.lightnetWorkDir, 'config.json');
  lightnetLogsDir = path.resolve(Constants.lightnetWorkDir, 'logs');
  lightnetExplorerDir = path.resolve(Constants.lightnetWorkDir, 'explorer');
  lightnetExplorerConfigFile = path.resolve(lightnetExplorerDir, 'config.json');
});

beforeEach(() => {
  jest.clearAllMocks();
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    assert: jest.fn(),
  };
  jest.spyOn(shell, 'exit').mockImplementation(() => {});
  jest.spyOn(process, 'exit').mockImplementation(() => {});
  jest.spyOn(table, 'getBorderCharacters').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('lightnet.js', () => {
  describe('lightnetStart()', () => {
    it('should start the Lightnet in default mode', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks();
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      checkSavedJsonConfig(fs.outputJsonSync.mock.calls, lightnetConfigFile, {
        containerId: 'lightnetContainer1',
        containerVolume: 'lightnetVolume1',
        ...targetMethodParams,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should start the Lightnet in real mode', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'real',
        proofLevel: 'full',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerContainer: {
          id: 'lightnetContainer1',
          state: '',
          volume: 'lightnetVolume1',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      checkSavedJsonConfig(fs.outputJsonSync.mock.calls, lightnetConfigFile, {
        containerId: 'lightnetContainer1',
        containerVolume: 'lightnetVolume1',
        ...targetMethodParams,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should start the Lightnet in multi-node mode (no archive)', async () => {
      const targetMethodParams = {
        mode: 'multi-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: false,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerContainer: {
          id: 'lightnetContainer1',
          state: '',
          volume: 'lightnetVolume1',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      checkSavedJsonConfig(fs.outputJsonSync.mock.calls, lightnetConfigFile, {
        containerId: 'lightnetContainer1',
        containerVolume: 'lightnetVolume1',
        ...targetMethodParams,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should start the Lightnet without Docker image pulling', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'real',
        proofLevel: 'full',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: false,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks();
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      checkSavedJsonConfig(fs.outputJsonSync.mock.calls, lightnetConfigFile, {
        containerId: 'lightnetContainer1',
        containerVolume: 'lightnetVolume1',
        ...targetMethodParams,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should start the Lightnet without syncing with the blockchain', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: false,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks();
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      checkSavedJsonConfig(fs.outputJsonSync.mock.calls, lightnetConfigFile, {
        containerId: 'lightnetContainer1',
        containerVolume: 'lightnetVolume1',
        ...targetMethodParams,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The lightweight Mina blockchain network Docker container((.|\n)*)is running((.|\n)*)/gi
        )
      );
    });

    it('should exit if Docker Engine is not installed', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerEngine: {
          isCommandAvailable: false,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetStart } = await import('./lightnet.js');

      await expect(lightnetStart(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Please ensure that Docker Engine is installed')
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if Docker Engine is not up and running', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: false,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetStart } = await import('./lightnet.js');

      await expect(lightnetStart(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Please ensure that Docker Engine is running')
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if Lightnet is already running', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        configParams: {
          mainConfigExists: true,
        },
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          state: 'running',
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { lightnetStart } = await import('./lightnet.js');

      await expect(lightnetStart(targetMethodParams)).rejects.toThrow(
        'process.exit'
      );

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The lightweight Mina blockchain network is already running!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    // TODO: Fix this
    // it('should exit if waiting for blockchain readiness max attempts reached', async () => {
    //   const targetMethodParams = {
    //     mode: 'single-node',
    //     type: 'fast',
    //     proofLevel: 'none',
    //     minaBranch: 'compatible',
    //     archive: true,
    //     sync: true,
    //     pull: true,
    //     minaLogLevel: 'Trace',
    //   };
    //   global.setTimeout = jest.fn((callback) => callback());
    //   await setupLightnetStartMocks({
    //     daemon: {
    //       thrownOnResponse: false,
    //       okResponse: false,
    //       status: 'BOOTSTRAPPING',
    //     },
    //   });
    // shell.exit.mockImplementation(() => {
    //   throw new Error('shell.exit');
    // });
    // process.exit.mockImplementation(() => {
    //   throw new Error('process.exit');
    // });
    // const { lightnetStart } = await import('./lightnet.js');

    // await expect(lightnetStart(targetMethodParams)).rejects.toThrow(
    //   'process.exit'
    // );

    // jest.runAllTimers();
    // expect(console.log).toHaveBeenCalledWith(
    //   expect.stringContaining(
    //     'Maximum blockchain network readiness check attempts reached.'
    //   )
    // );
    // expect(shell.exit).toHaveBeenCalledWith(1);
    // expect(process.exit).toHaveBeenCalledWith(1);
    // });

    it('should exit if ports unavailable', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        configParams: {
          mainConfigExists: true,
          withBusyPorts: true,
        },
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          state: 'not-found',
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { lightnetStart } = await import('./lightnet.js');

      await expect(lightnetStart(targetMethodParams)).rejects.toThrow(
        'process.exit'
      );

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The following local ports are required but unavailable at this time'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should prompt if foreign Docker container exists (by config)', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        configParams: {
          mainConfigExists: false,
        },
        dockerContainer: {
          state: 'running',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'proceed', type: 'select' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should prompt if foreign Docker container exists (by container id mismatch)', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        configParams: {
          mainConfigExists: true,
          containerId: 'foreignContainerId1',
          proceed: 'yes',
          processName: 'Mina multi-purpose Daemon',
          withBusyPorts: false,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          volume: 'lightnetVolume1',
          state: 'pending',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'proceed', type: 'select' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should prompt if there is not enough Docker Engine resources available', async () => {
      const targetMethodParams = {
        mode: 'single-node',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
          resourcesAvailable: '1:1',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'proceed', type: 'select' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });

    it('should prompt if there is not enough Docker Engine resources available (unknown mode)', async () => {
      const targetMethodParams = {
        mode: 'unknown-mode',
        type: 'fast',
        proofLevel: 'none',
        minaBranch: 'compatible',
        archive: true,
        sync: true,
        pull: true,
        minaLogLevel: 'Trace',
      };
      await setupLightnetStartMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
          resourcesAvailable: '1:1',
        },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'proceed', type: 'select' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });
  });

  describe('lightnetStop()', () => {
    it('should stop the Lightnet (save logs, clean up)', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks();
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)can be found at the following path((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (save logs, clean up, multi-node)', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          logsDirIsEmpty: false,
          proceed: 'yes',
          processName: 'Mina multi-purpose Daemon',
          mode: 'multi-node',
          archive: true,
          throwOnLogsProcessing: false,
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)can be found at the following path((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (save logs, clean up, multi-node, no archive)', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          logsDirIsEmpty: false,
          proceed: 'yes',
          processName: 'Mina multi-purpose Daemon',
          mode: 'multi-node',
          archive: false,
          throwOnLogsProcessing: false,
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)can be found at the following path((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (no save logs, clean up)', async () => {
      const targetMethodParams = {
        saveLogs: false,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          logsDirIsEmpty: true,
          logsDirExists: true,
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetLogsDir);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (no save logs, no clean up)', async () => {
      const targetMethodParams = {
        saveLogs: false,
        cleanUp: false,
      };
      await setupLightnetStopMocks();
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).not.toHaveBeenCalledWith(lightnetConfigFile);
      expect(fs.removeSync).not.toHaveBeenCalledWith(lightnetLogsDir);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (no save logs, no logs dir, clean up)', async () => {
      const targetMethodParams = {
        saveLogs: false,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          logsDirIsEmpty: false,
          logsDirExists: false,
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(fs.removeSync).not.toHaveBeenCalledWith(lightnetLogsDir);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should stop the Lightnet (throw on logs, clean up)', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          logsDirIsEmpty: false,
          logsDirExists: false,
          throwOnLogsProcessing: true,
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(fs.removeSync).toHaveBeenCalledWith(lightnetConfigFile);
      expect(fs.removeSync).not.toHaveBeenCalledWith(lightnetLogsDir);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should prompt if foreign Docker container exists', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          mainConfigExists: false,
        },
        dockerContainer: {
          state: 'running',
        },
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'proceed', type: 'select' })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Done((.|\n)*)/gi)
      );
    });

    it('should exit if prompt was declined', async () => {
      const targetMethodParams = {
        saveLogs: true,
        cleanUp: true,
      };
      await setupLightnetStopMocks({
        configParams: {
          proceed: 'no',
          mainConfigExists: false,
        },
        dockerContainer: {
          state: 'running',
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetStop } = await import('./lightnet.js');

      await lightnetStop(targetMethodParams);

      jest.runAllTimers();
      expect(shell.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('lightnetStatus()', () => {
    it('should print the Lightnet status', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Lightweight Mina blockchain network((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)More information can be found at:((.|\n)*)/gi
        )
      );
    });

    it('should print the Lightnet status (multi-node, no archive)', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: '',
        mode: 'multi-node',
        archive: false,
      });
      jest.spyOn(global, 'fetch').mockImplementation(() => {
        return Promise.resolve({
          ok: false,
        });
      });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Lightweight Mina blockchain network((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)More information can be found at:((.|\n)*)/gi
        )
      );
    });

    it('should handle correct GraphQL response', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: '',
        mode: 'multi-node',
        archive: false,
      });
      jest.spyOn(global, 'fetch').mockImplementation((_endpoint, options) => {
        if (options?.body?.includes('consensusConfiguration')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  syncStatus: 'synced',
                  daemonStatus: {
                    chainId: 'chainId1',
                    consensusConfiguration: {
                      k: 1,
                      slotDuration: 1,
                      slotsPerEpoch: 1,
                    },
                    commitId: 'commitId1',
                    uptimeSecs: 1,
                    consensusMechanism: 'consensusMechanism1',
                    snarkWorkFee: 1,
                    numAccounts: 1,
                  },
                },
              }),
          });
        }
      });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Lightweight Mina blockchain network((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)More information can be found at:((.|\n)*)/gi
        )
      );
    });

    it('should handle GraphQL errors', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: '',
        mode: 'multi-node',
        archive: false,
      });
      jest.spyOn(global, 'fetch').mockImplementation((_endpoint, options) => {
        if (options?.body?.includes('consensusConfiguration')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: undefined,
              }),
          });
        }
      });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Lightweight Mina blockchain network((.|\n)*)/gi
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)More information can be found at:((.|\n)*)/gi
        )
      );
    });

    it('should warn if not possible to print full lightnet status', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'not-found',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/((.|\n)*)Warning((.|\n)*)/gi)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Only limited information is available((.|\n)*)/gi
        )
      );
    });

    it('should exit if no Lightnet container found', async () => {
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'not-found',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: false });
      const { lightnetStatus } = await import('./lightnet.js');

      await lightnetStatus();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The lightweight Mina blockchain network Docker container does not exist!((.|\n)*)/gi
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('lightnetSaveLogs()', () => {
    it('should save the Docker container logs (single-node, archive)', async () => {
      fs.ensureDirSync.mockImplementation(() => {});
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      const { lightnetSaveLogs } = await import('./lightnet.js');

      await lightnetSaveLogs();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)logs((.|\n)*)were preserved at the following path((.|\n)*)/gi
        )
      );
    });

    it('should save the Docker container logs (multi-node, archive)', async () => {
      fs.ensureDirSync.mockImplementation(() => {});
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'multi-node',
        archive: true,
      });
      const { lightnetSaveLogs } = await import('./lightnet.js');

      await lightnetSaveLogs();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)logs((.|\n)*)were preserved at the following path((.|\n)*)/gi
        )
      );
    });

    it('should save the Docker container logs (multi-node, no archive)', async () => {
      fs.ensureDirSync.mockImplementation(() => {});
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'multi-node',
        archive: false,
      });
      const { lightnetSaveLogs } = await import('./lightnet.js');

      await lightnetSaveLogs();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)The Docker container processes((.|\n)*)logs((.|\n)*)were preserved at the following path((.|\n)*)/gi
        )
      );
    });

    it('should not save logs if there is no Docker container found', async () => {
      fs.ensureDirSync.mockImplementation(() => {});
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'not-found',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      const { lightnetSaveLogs } = await import('./lightnet.js');

      await lightnetSaveLogs();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'It is impossible to preserve the logs at the moment!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should not save the Docker container logs in case of issues', async () => {
      fs.ensureDirSync.mockImplementation(() => {
        throw new Error('fs.ensureDirSync');
      });
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      const { lightnetSaveLogs } = await import('./lightnet.js');

      await lightnetSaveLogs();

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Issue happened during the Docker container processes logs preservation!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('lightnetFollowLogs()', () => {
    it('should stream the Docker container logs (single-node)', async () => {
      const selectedProcess = 'Mina multi-purpose Daemon';
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      setupEnquirerPromptMocks({
        selectedProcess,
      });
      const { lightnetFollowLogs } = await import('./lightnet.js');

      await lightnetFollowLogs({});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Use Ctrl+C to stop the file content streaming.'
        )
      );
    });

    it('should stream the Docker container logs (multi-node)', async () => {
      const selectedProcess = 'Whale BP #1';
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'multi-node',
        archive: true,
      });
      const { lightnetFollowLogs } = await import('./lightnet.js');

      await lightnetFollowLogs({ process: selectedProcess });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Use Ctrl+C to stop the file content streaming.'
        )
      );
    });

    it('should stream the Docker container logs (multi-node, no archive)', async () => {
      const selectedProcess = 'Whale BP #1';
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'multi-node',
        archive: false,
      });
      const { lightnetFollowLogs } = await import('./lightnet.js');

      await lightnetFollowLogs({ process: selectedProcess });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Use Ctrl+C to stop the file content streaming.'
        )
      );
    });

    it('should exit if the Docker container does not exist', async () => {
      const selectedProcess = 'Mina multi-purpose Daemon';
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'not-found',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: false });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetFollowLogs } = await import('./lightnet.js');

      await expect(
        lightnetFollowLogs({ process: selectedProcess })
      ).rejects.toThrow('shell.exit');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'It is impossible to follow the logs at the moment!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should exit in case of streaming issues', async () => {
      const selectedProcess = 'Mina multi-purpose Daemon';
      setupShellWhichMocks({ isCommandAvailable: true });
      setupShellExecMocks({
        dockerEngine: {
          isCommandAvailable: true,
          isUpAndRunning: true,
        },
        dockerContainer: {
          id: 'lightnetContainer1',
          state: 'running',
          volume: 'lightnetVolume1',
        },
      });
      setupFsExistsSyncMocks({ mainConfigExists: true });
      setupFsReadJSONSyncMocks({
        containerId: 'lightnetContainer1',
        mode: 'single-node',
        archive: true,
      });
      jest.spyOn(table, 'getBorderCharacters').mockImplementation(() => {
        throw new Error('table.getBorderCharacters');
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { lightnetFollowLogs } = await import('./lightnet.js');

      await expect(
        lightnetFollowLogs({ process: selectedProcess })
      ).rejects.toThrow('process.exit');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Issue happened while streaming the Docker container file content!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('lightnetExplorer()', () => {
    // Explorer listing tests

    it('should list the explorer versions (more than permitted limit)', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks();
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.not.stringContaining('No data available yet.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('v0.0.1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ Yes')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Only((.|\n)*)5((.|\n)*)most recent versions are shown.((.|\n)*)/gi
        )
      );
    });

    it('should list the explorer versions (less than permitted limit)', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks({
        configFs: {
          exists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: false,
          respondWithMoreThanPermitLimit: false,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.not.stringContaining('No data available yet.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('v0.0.1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✓ Yes')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Only((.|\n)*)5((.|\n)*)most recent versions are shown.((.|\n)*)/gi
        )
      );
    });

    it('should list the explorer versions (no current config exists)', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks({
        configFs: {
          exists: false,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: false,
          respondWithMoreThanPermitLimit: false,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('No data available yet.')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('✓ Yes')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Only((.|\n)*)5((.|\n)*)most recent versions are shown.((.|\n)*)/gi
        )
      );
    });

    it('should list no explorer versions if fetch failed', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks({
        configFs: {
          exists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: true,
          emptyResponse: false,
          respondWithMoreThanPermitLimit: true,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No data available yet.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Warning: Unable to fetch lightweight Mina explorer releases. This may be due to connectivity issues.'
        )
      );
    });

    it('should list no explorer versions if fetch did not succeed', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks({
        configFs: {
          exists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: false,
          status: 500,
          thrownOnResponse: false,
          emptyResponse: false,
          respondWithMoreThanPermitLimit: true,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No data available yet.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Warning: Unable to fetch lightweight Mina explorer releases. This may be due to connectivity issues.'
        )
      );
    });

    it('should exit in case of error thrown', async () => {
      const targetMethodParams = { list: true, use: '' };
      await setupLightnetExplorerListingMocks({
        configFs: {
          exists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: false,
          status: 500,
          thrownOnResponse: false,
          emptyResponse: false,
          respondWithMoreThanPermitLimit: true,
        },
      });
      jest.spyOn(table, 'getBorderCharacters').mockImplementation(() => {
        throw new Error('table.getBorderCharacters');
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await expect(lightnetExplorer(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Issue happened while fetching the lightweight Mina explorer available versions!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    // Explorer usage tests

    it('should download and launch the latest explorer version', async () => {
      const targetMethodParams = { list: false, use: 'latest' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.3',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: false,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(decompress).toHaveBeenCalled();
      expect(opener).toHaveBeenCalledWith(expect.stringContaining('file://'));
      expect(fs.outputJsonSync).toHaveBeenCalledWith(
        lightnetExplorerConfigFile,
        { version: 'v0.0.3' },
        { spaces: 2, flag: 'w' }
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The lightweight Mina explorer is available at the following path'
        )
      );
    });

    it('should launch the locally available explorer version', async () => {
      const targetMethodParams = { list: false, use: 'v0.0.2' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.2',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: true,
          currentVersion: 'v0.0.2',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: true,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).toHaveBeenCalledWith(expect.stringContaining('file://'));
      expect(fs.outputJsonSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The lightweight Mina explorer is available at the following path'
        )
      );
    });

    it('should launch the explorer and update the config (no previous config exists)', async () => {
      const targetMethodParams = { list: false, use: 'v0.0.2' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.2',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: true,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      fs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      const { lightnetExplorer } = await import('./lightnet.js');

      await lightnetExplorer(targetMethodParams);

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).toHaveBeenCalledWith(expect.stringContaining('file://'));
      expect(fs.outputJsonSync).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The lightweight Mina explorer is available at the following path'
        )
      );
    });

    it('should exit if explorer binary artifact download fails', async () => {
      const targetMethodParams = { list: false, use: 'latest' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.3',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: false,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: false,
          status: 500,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await expect(lightnetExplorer(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).not.toHaveBeenCalled();
      expect(fs.outputJsonSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Issue happened while launching the lightweight Mina explorer!'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no local nor remote explorer versions available', async () => {
      const targetMethodParams = { list: false, use: 'v0.0.1' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.1',
        },
        configFs: {
          exists: true,
          dirExists: false,
          localVersionExists: false,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: true,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await expect(lightnetExplorer(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).not.toHaveBeenCalled();
      expect(fs.outputJsonSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to use the latest local version.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'No local versions of the lightweight Mina explorer are available. Please check your network connection and try again.'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no remote explorer versions available', async () => {
      const targetMethodParams = { list: false, use: 'v0.0.1' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.0.1',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: true,
          currentVersion: 'v0.0.1',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: true,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await expect(lightnetExplorer(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).not.toHaveBeenCalled();
      expect(fs.outputJsonSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'No lightweight Mina explorer versions are available yet. Please try again later.'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no remote explorer version to use has been found', async () => {
      const targetMethodParams = { list: false, use: 'v0.4.2' };
      await setupLightnetExplorerUsageMocks({
        configParams: {
          useVersion: 'v0.4.2',
        },
        configFs: {
          exists: true,
          dirExists: true,
          localVersionExists: true,
          currentVersion: 'v0.4.2',
        },
        fetchReleases: {
          okResponse: true,
          status: 200,
          thrownOnResponse: false,
          emptyResponse: false,
        },
        fetchBinary: {
          okResponse: true,
          status: 200,
        },
      });
      shell.exit.mockImplementation(() => {
        throw new Error('shell.exit');
      });
      const { lightnetExplorer } = await import('./lightnet.js');

      await expect(lightnetExplorer(targetMethodParams)).rejects.toThrow(
        'shell.exit'
      );

      jest.runAllTimers();
      expect(decompress).not.toHaveBeenCalled();
      expect(opener).not.toHaveBeenCalled();
      expect(fs.outputJsonSync).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The specified version ("v0.4.2") of the lightweight Mina explorer does not exist or is not available for download.'
        )
      );
      expect(shell.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('shellExec()', () => {
    it('should execute command without the options', async () => {
      shell.exec.mockImplementation((cmd, _options, callback) => {
        callback(0, 'stdOut', 'stdErr');
      });
      const { shellExec } = await import('./lightnet.js');

      const result = await shellExec('testCmd');

      expect(result).toEqual({ code: 0, stdout: 'stdOut', stderr: 'stdErr' });
    });
  });

  describe('secondsToHms()', () => {
    it('converts zero seconds correctly', () => {
      expect(secondsToHms(0)).toBe('');
    });

    it('converts seconds within a minute correctly', () => {
      expect(secondsToHms(45)).toBe('45 seconds');
    });

    it('converts 60 seconds correctly', () => {
      expect(secondsToHms(60)).toBe('1 minute');
    });

    it('converts multiple minutes correctly', () => {
      expect(secondsToHms(300)).toBe('5 minutes');
    });

    it('converts exact hours correctly', () => {
      expect(secondsToHms(3600)).toBe('1 hour');
    });

    it('converts hours and minutes correctly', () => {
      expect(secondsToHms(3660)).toBe('1 hour, 1 minute');
    });

    it('converts hours, minutes, and seconds correctly', () => {
      expect(secondsToHms(3665)).toBe('1 hour, 1 minute, 5 seconds');
    });

    it('converts multiple hours correctly', () => {
      expect(secondsToHms(7200)).toBe('2 hours');
    });

    it('converts multiple hours, minutes and seconds correctly', () => {
      expect(secondsToHms(7385)).toBe('2 hours, 3 minutes, 5 seconds');
    });

    it('handles large values correctly', () => {
      expect(secondsToHms(86400)).toBe('24 hours');
    });

    it('handles odd values correctly', () => {
      expect(secondsToHms(5401)).toBe('1 hour, 30 minutes, 1 second');
    });

    it('handles combinations without seconds correctly', () => {
      expect(secondsToHms(3900)).toBe('1 hour, 5 minutes');
    });

    it('handles combinations without minutes correctly', () => {
      expect(secondsToHms(7205)).toBe('2 hours, 5 seconds');
    });
  });

  describe('getSystemQuotes()', () => {
    it('should determine proper quotes on Windows (CMD)', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        shell.exec.mockReturnValue({ code: 1 });
        const { getSystemQuotes } = await import('./lightnet.js');

        const { quotes, escapeQuotes } = getSystemQuotes();

        expect(quotes).toBe('"');
        expect(escapeQuotes).toBe('\\"');
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });

    it('should determine proper quotes on Windows (PowerShell)', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        shell.exec.mockReturnValue({ code: 0 });
        const { getSystemQuotes } = await import('./lightnet.js');

        const { quotes, escapeQuotes } = getSystemQuotes();

        expect(quotes).toBe('"');
        expect(escapeQuotes).toBe('\\`');
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });
  });

  describe('buildDebugLogger()', () => {
    it('should build debug logger (without namespaces provided)', async () => {
      delete process.env.DEBUG;
      const { buildDebugLogger } = await import('./lightnet.js');

      let debugLogger = buildDebugLogger();
      expect(debugLogger).toBeDefined();
      debugLogger();
    });

    it('should build debug logger (with namespaces provided)', async () => {
      process.env.DEBUG = '*';
      const { buildDebugLogger } = await import('./lightnet.js');

      let debugLogger = buildDebugLogger();
      expect(debugLogger).toBeDefined();
      debugLogger();
      process.env.DEBUG = 'zk:*';
      debugLogger = buildDebugLogger();
      expect(debugLogger).toBeDefined();
      debugLogger();
      process.env.DEBUG = 'zk:lightnet';
      debugLogger = buildDebugLogger();
      expect(debugLogger).toBeDefined();
      debugLogger();
      process.env.DEBUG = 'test';
      debugLogger = buildDebugLogger();
      expect(debugLogger).toBeDefined();
      debugLogger();
    });
  });
});

function setupShellWhichMocks({ isCommandAvailable = true } = {}) {
  shell.which.mockReturnValueOnce(isCommandAvailable);
}

function setupFsExistsSyncMocks({
  mainConfigExists = true,
  logsDirExists = false,
} = {}) {
  fs.existsSync.mockImplementation((_path) => {
    if (_path.includes(lightnetConfigFile)) {
      return mainConfigExists;
    } else if (_path.includes(lightnetLogsDir)) {
      return logsDirExists;
    }
    return false;
  });
}
function setupFsReadJSONSyncMocks({
  containerId = '',
  mode = '',
  archive = true,
} = {}) {
  fs.readJSONSync.mockImplementation((_path) => {
    if (_path.includes(lightnetConfigFile)) {
      return {
        containerId,
        mode,
        archive,
      };
    }
  });
}

function setupEnquirerPromptMocks({
  proceed = 'yes',
  selectedProcess = 'Mina multi-purpose Daemon',
} = {}) {
  enquirer.prompt.mockImplementation(({ name } = {}) => {
    if (name === 'proceed') {
      return { proceed };
    } else if (name === 'selectedProcess') {
      return { selectedProcess };
    }
  });
}

function setupShellExecMocks({
  dockerEngine = {
    isCommandAvailable: true,
    isUpAndRunning: true,
    resourcesAvailable: '32:32000000000',
  },
  dockerContainer = {
    id: 'lightnetContainer1',
    state: 'not-found',
    volume: 'lightnetVolume1',
  },
} = {}) {
  shell.exec.mockImplementation((cmd, _options, callback) => {
    // resolve({ code, stdout, stderr })
    if (cmd === 'docker ps -a') {
      callback(dockerEngine.isUpAndRunning ? 0 : 1, '', '');
    } else if (cmd.includes('{{.State.Status}}')) {
      callback(0, dockerContainer.state, '');
    } else if (cmd.includes('{{.Id}}')) {
      callback(0, dockerContainer.id, '');
    } else if (cmd.includes('{{.NCPU}}:{{.MemTotal}}')) {
      callback(0, dockerEngine.resourcesAvailable, '');
    } else if (cmd.includes('{{range .Mounts}}')) {
      callback(0, dockerContainer.volume, '');
    } else if (
      cmd.includes('docker stop') ||
      cmd.includes('docker rm') ||
      cmd.includes('docker volume rm') ||
      cmd.includes('docker image prune -f --filter "dangling=true"') ||
      cmd.includes('docker pull o1labs/mina-local-network') ||
      cmd.includes('docker run') ||
      cmd.includes('docker cp') ||
      cmd.includes('docker exec')
    ) {
      callback(0, '', 'stdErr for coverage');
    }
  });
}

async function setupLightnetStartMocks({
  configParams = {
    mainConfigExists: true,
    containerId: '',
    proceed: 'yes',
    processName: 'Mina multi-purpose Daemon',
    withBusyPorts: false,
  },
  dockerEngine = {
    isCommandAvailable: true,
    isUpAndRunning: true,
    resourcesAvailable: '32:32000000000',
  },
  dockerContainer = {
    id: 'lightnetContainer1',
    state: 'not-found',
    volume: 'lightnetVolume1',
  },
  daemon = { thrownOnResponse: false, okResponse: true, status: 'SYNCED' },
} = {}) {
  jest.useFakeTimers();
  networkHelpers.checkLocalPortsAvailability.mockResolvedValue({
    error: configParams.withBusyPorts,
    message:
      'The following local ports are required but unavailable at this time',
  });
  setupFsExistsSyncMocks({ mainConfigExists: configParams.mainConfigExists });
  setupFsReadJSONSyncMocks({ containerId: configParams.containerId });
  setupEnquirerPromptMocks({
    proceed: configParams.proceed,
    selectedProcess: configParams.processName,
  });
  setupShellWhichMocks({ isCommandAvailable: dockerEngine.isCommandAvailable });
  setupShellExecMocks({ dockerEngine, dockerContainer });
  jest.spyOn(global, 'fetch').mockImplementation((_endpoint, options) => {
    if (daemon.thrownOnResponse) {
      return Promise.reject(new Error('Failed to fetch'));
    } else {
      if (options?.body?.includes('syncStatus')) {
        return Promise.resolve({
          ok: daemon.okResponse,
          json: () => Promise.resolve({ data: { syncStatus: daemon.status } }),
        });
      }
    }
  });
}

async function setupLightnetStopMocks({
  configParams = {
    logsDirIsEmpty: false,
    mainConfigExists: true,
    logsDirExists: false,
    proceed: 'yes',
    processName: 'Mina multi-purpose Daemon',
    mode: 'single-node',
    archive: true,
    throwOnLogsProcessing: false,
  },
  dockerEngine = {
    isCommandAvailable: true,
    isUpAndRunning: true,
    resourcesAvailable: '32:32000000000',
  },
  dockerContainer = {
    id: 'lightnetContainer1',
    state: 'running',
    volume: 'lightnetVolume1',
  },
} = {}) {
  jest.useFakeTimers();
  if (configParams.throwOnLogsProcessing) {
    fs.ensureDirSync.mockImplementation(() => {
      throw new Error('fs.ensureDirSync');
    });
  }
  nodeFs.readdirSync.mockReturnValue(
    configParams.logsDirIsEmpty ? [] : ['logs']
  );
  setupFsExistsSyncMocks({
    mainConfigExists: configParams.mainConfigExists,
    logsDirExists: configParams.logsDirExists,
  });
  setupFsReadJSONSyncMocks({
    containerId: dockerContainer.id,
    mode: configParams.mode,
    archive: configParams.archive,
  });
  setupEnquirerPromptMocks({
    proceed: configParams.proceed,
    selectedProcess: configParams.processName,
  });
  setupShellWhichMocks({ isCommandAvailable: dockerEngine.isCommandAvailable });
  setupShellExecMocks({ dockerEngine, dockerContainer });
}

async function setupLightnetExplorerListingMocks({
  configFs = {
    exists: true,
    currentVersion: 'v0.0.1',
  },
  fetchReleases = {
    okResponse: true,
    status: 200,
    thrownOnResponse: false,
    emptyResponse: false,
    respondWithMoreThanPermitLimit: true,
  },
} = {}) {
  jest.useFakeTimers();
  fs.existsSync.mockImplementation((_path) => {
    if (_path.includes(lightnetExplorerConfigFile)) {
      return configFs.exists;
    }
    return false;
  });
  fs.readJSONSync.mockImplementation((_path) => {
    if (_path.includes(lightnetExplorerConfigFile)) {
      return {
        version: configFs.currentVersion,
      };
    }
  });
  jest.spyOn(global, 'fetch').mockImplementation((endpoint) => {
    if (fetchReleases.thrownOnResponse) {
      return Promise.reject(new Error('Failed to fetch'));
    } else {
      if (endpoint.includes('mina-lightweight-explorer')) {
        const response = fetchReleases.emptyResponse
          ? []
          : fetchReleases.respondWithMoreThanPermitLimit
            ? [
                {
                  name: 'v0.0.1',
                  published_at: '2024-01-01T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.2',
                  published_at: '2024-01-02T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.3',
                  published_at: '2024-01-03T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.4',
                  published_at: '2024-01-04T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.5',
                  published_at: '2024-01-05T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.6',
                  published_at: '2024-01-06T00:00:00Z',
                  zipball_url: '',
                },
              ]
            : [
                {
                  name: 'v0.0.1',
                  published_at: '2024-01-01T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.2',
                  published_at: '2024-01-02T00:00:00Z',
                  zipball_url: '',
                },
                {
                  name: 'v0.0.3',
                  published_at: '2024-01-03T00:00:00Z',
                  zipball_url: '',
                },
              ];
        return Promise.resolve({
          ok: fetchReleases.okResponse,
          status: fetchReleases.status,
          json: () => Promise.resolve(response),
        });
      }
    }
  });
}

async function setupLightnetExplorerUsageMocks({
  configParams = {
    useVersion: 'v0.0.3',
  },
  configFs = {
    exists: true,
    dirExists: true,
    localVersionExists: false,
    currentVersion: 'v0.0.1',
  },
  fetchReleases = {
    okResponse: true,
    status: 200,
    thrownOnResponse: false,
    emptyResponse: false,
  },
  fetchBinary = {
    okResponse: true,
    status: 200,
  },
} = {}) {
  jest.useFakeTimers();
  fs.ensureDirSync.mockImplementation(() => {});
  fs.statSync.mockReturnValue({ isDirectory: () => true });
  fs.existsSync.mockImplementation((_path) => {
    if (_path.includes(lightnetExplorerConfigFile)) {
      return configFs.exists;
    } else if (_path.endsWith(lightnetExplorerDir)) {
      return configFs.dirExists;
    } else if (
      _path.endsWith(path.resolve(lightnetExplorerDir, configParams.useVersion))
    ) {
      return configFs.localVersionExists;
    }
    return false;
  });
  fs.readdirSync.mockReturnValue(['v0.0.1', 'v0.0.2']);
  fs.readJSONSync.mockImplementation((_path) => {
    if (_path.includes(lightnetExplorerConfigFile)) {
      return {
        version: configFs.currentVersion,
      };
    }
  });
  jest.spyOn(global, 'fetch').mockImplementation((endpoint) => {
    if (fetchReleases.thrownOnResponse) {
      return Promise.reject(new Error('Failed to fetch'));
    } else {
      if (endpoint.includes('mina-lightweight-explorer')) {
        const response = fetchReleases.emptyResponse
          ? []
          : [
              {
                name: 'v0.0.3',
                published_at: '2024-01-03T00:00:00Z',
                zipball_url: 'zipball_url',
              },
              {
                name: 'v0.0.2',
                published_at: '2024-01-02T00:00:00Z',
                zipball_url: 'zipball_url',
              },
              {
                name: 'v0.0.1',
                published_at: '2024-01-01T00:00:00Z',
                zipball_url: 'zipball_url',
              },
            ];
        return Promise.resolve({
          ok: fetchReleases.okResponse,
          status: fetchReleases.status,
          json: () => Promise.resolve(response),
        });
      } else if (endpoint === 'zipball_url') {
        return Promise.resolve({
          ok: fetchBinary.okResponse,
          status: fetchBinary.status,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });
      }
    }
  });
}

function checkSavedJsonConfig(fsCalls, configFileName, jsonContent) {
  expect(fsCalls[0][0]).toBe(configFileName);
  expect(fsCalls[0][1]).toEqual(jsonContent);
}
