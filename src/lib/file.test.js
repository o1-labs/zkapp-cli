import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => ({
  default: {
    green: jest.fn((text) => `green: ${text}`),
    red: jest.fn((text) => `red: ${text}`),
    italic: jest.fn((text) => `italic: ${text}`),
  },
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    existsSync: jest.fn(),
    outputFileSync: jest.fn(),
  },
}));

jest.unstable_mockModule('path', () => ({
  default: {
    join: (...args) => args.join('/'),
  },
}));

let fs, file, parsePath, pathExists, chalk;

beforeAll(async () => {
  fs = (await import('fs-extra')).default;
  chalk = (await import('chalk')).default;
  const fileModule = await import('./file.js');
  file = fileModule.default;
  parsePath = fileModule.parsePath;
  pathExists = fileModule.pathExists;
});

beforeEach(() => {
  jest.clearAllMocks();
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  jest.spyOn(process, 'exit').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const mockExistsSync = (existingPaths) => {
  fs.existsSync.mockImplementation((filePath) =>
    existingPaths.includes(filePath)
  );
};

describe('file()', () => {
  it('should create new files when no existing file conflicts', async () => {
    mockExistsSync([]);

    await file('src/myFile');

    expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.js',
      expect.any(String)
    );
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.test.js',
      expect.any(String)
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.js')
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.test.js')
    );
  });

  it('should create TypeScript files when tsconfig.json exists', async () => {
    mockExistsSync(['tsconfig.json']);

    await file('src/myFile');

    expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.ts',
      expect.any(String)
    );
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.test.ts',
      expect.any(String)
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.ts')
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.test.ts')
    );
  });

  it('should prepend src to userPath when in root dir and userPath does not start with src', async () => {
    mockExistsSync(['package.json']);

    await file('myFile');

    expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.js',
      expect.any(String)
    );
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.test.js',
      expect.any(String)
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.js')
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.test.js')
    );
  });

  it('should not create files if they already exist', async () => {
    mockExistsSync(['src/myFile.js', 'src/myFile.test.js']);

    await file('src/myFile');

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle cases where only one file exists', async () => {
    const cases = [
      {
        existingFiles: ['src/myFile.js'],
        expectedMsg:
          'Please choose a different name or delete the existing file',
      },
      {
        existingFiles: ['src/myFile.test.js'],
        expectedMsg:
          'Please choose a different name or delete the existing file',
      },
    ];

    for (const { existingFiles, expectedMsg } of cases) {
      mockExistsSync(existingFiles);
      await file('src/myFile');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.log).toHaveBeenCalledWith(expectedMsg);
      jest.clearAllMocks();
    }
  });

  it('should create files if neither file exists', async () => {
    mockExistsSync([]);

    await file('src/myFile');

    expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.js',
      expect.any(String)
    );
    expect(fs.outputFileSync).toHaveBeenCalledWith(
      'src/myFile.test.js',
      expect.any(String)
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.js')
    );
    expect(console.log).toHaveBeenCalledWith(
      chalk.green('Created src/myFile.test.js')
    );
  });
});

describe('parsePath()', () => {
  it('should correctly parse paths', () => {
    const result = parsePath('/current/dir', 'path/to/name');
    expect(result).toEqual({
      fullPath: '/current/dir/path/to/name',
      projName: 'name',
      userPath: 'path/to',
    });
  });
});

describe('pathExists()', () => {
  it('should return true if path exists', () => {
    mockExistsSync(['path/to/existingFile']);
    const result = pathExists('path/to/existingFile');
    expect(result).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      chalk.red(`"${chalk.italic('path/to/existingFile')}" already exists`)
    );
  });

  it('should return undefined if path does not exist', () => {
    mockExistsSync([]);
    const result = pathExists('path/to/nonExistingFile');
    expect(result).toBeUndefined();
  });
});
