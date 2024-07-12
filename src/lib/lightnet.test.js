import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => {
  const createChainedMock = (color) => {
    const mockFn = jest.fn((text) => `${color}: ${text}`);
    mockFn.bold = jest.fn((text) => `bold ${color}: ${text}`);
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

jest.unstable_mockModule('debug', () => ({ default: () => jest.fn() }));

jest.unstable_mockModule('decompress', () => ({ default: () => jest.fn() }));

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
  },
}));

jest.unstable_mockModule('opener', () => ({ default: () => jest.fn() }));

jest.unstable_mockModule('ora', () => ({
  default: () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.unstable_mockModule('semver', () => ({
  default: {
    compare: jest.fn(),
  },
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

jest.unstable_mockModule('./networkHelpers.js', () => ({
  checkLocalPortsAvailability: jest.fn(),
}));

let fs,
  path,
  Constants,
  enquirer,
  // table,
  // decompress,
  // opener,
  // ora,
  // semver,
  networkHelpers,
  shell;

beforeAll(async () => {
  fs = (await import('fs-extra')).default;
  enquirer = (await import('enquirer')).default;
  // table = (await import('table')).table;
  // decompress = (await import('decompress')).default;
  // opener = (await import('opener')).default;
  // ora = (await import('ora')).default;
  // semver = (await import('semver')).default;
  shell = (await import('shelljs')).default;
  Constants = (await import('./constants.js')).default;
  path = (await import('node:path')).default;
  networkHelpers = await import('./networkHelpers.js');
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
      await setupCommonMocks({
        configParams: { ...targetMethodParams },
      });
      const { lightnetStart } = await import('./lightnet.js');

      await lightnetStart(targetMethodParams);

      jest.runAllTimers();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Blockchain network((.|\n)*)is ready((.|\n)*)/gi
        )
      );
    });
  });

  describe('lightnetStop()', () => {
    it('should execute the lightnetStop function correctly', async () => {});
  });

  describe('lightnetStatus()', () => {
    it('should execute the lightnetStatus function correctly', async () => {});
  });

  describe('lightnetSaveLogs()', () => {
    it('should execute the lightnetSaveLogs function correctly', async () => {});
  });

  describe('lightnetFollowLogs()', () => {
    it('should execute the lightnetFollowLogs function correctly', async () => {});
  });

  describe('lightnetExplorer()', () => {
    it('should execute the lightnetExplorer function correctly', async () => {});
  });
});

async function setupCommonMocks({
  configParams = {
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
  isMainConfigExists = true,
} = {}) {
  const lightnetConfigFile = path.resolve(
    Constants.lightnetWorkDir,
    'config.json'
  );

  jest.useFakeTimers();
  networkHelpers.checkLocalPortsAvailability.mockResolvedValue({
    error: configParams.withBusyPorts,
  });
  fs.existsSync.mockImplementation((_path) => {
    if (_path.includes(lightnetConfigFile)) {
      return isMainConfigExists;
    }
    return false;
  });
  fs.readJSONSync.mockImplementation((_path) => {
    if (_path.includes(lightnetConfigFile)) {
      return {
        containerId: configParams.containerId,
      };
    }
  });
  enquirer.prompt.mockImplementation(({ name } = {}) => {
    if (name === 'proceed') {
      return { proceed: configParams.proceed };
    } else if (name === 'selectedProcess') {
      return { selectedProcess: configParams.processName };
    }
  });
  shell.which.mockReturnValueOnce(dockerEngine.isCommandAvailable);
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
      cmd.includes('docker run')
    ) {
      callback(0, '', '');
    }
  });
  jest.spyOn(global, 'fetch').mockImplementation((endpoint, options) => {
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
