import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: jest.fn((text) => `blue: ${text}`),
    yellow: jest.fn((text) => `yellow: ${text}`),
    green: jest.fn((text) => `green: ${text}`),
    red: jest.fn((text) => `red: ${text}`),
    gray: jest.fn((text) => `gray: ${text}`),
    bold: jest.fn((text) => `bold: ${text}`),
    reset: jest.fn((text) => `reset: ${text}`),
  },
}));

jest.unstable_mockModule('shelljs', () => ({
  default: {
    mkdir: jest.fn(),
    cd: jest.fn(),
    pwd: jest.fn(),
    mv: jest.fn(),
  },
}));

jest.unstable_mockModule('ora', () => {
  const ora = jest.fn().mockImplementation(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
  return { default: ora };
});

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    existsSync: jest.fn(),
    cpSync: jest.fn(),
  },
}));

let fs,
  readDeployAliasesConfig,
  findIfClassExtendsSmartContract,
  step,
  shell,
  ora,
  setupProject;

beforeAll(async () => {
  fs = (await import('node:fs')).default;
  shell = (await import('shelljs')).default;
  ora = (await import('ora')).default;
  step = (await import('./helpers.js')).step;
  setupProject = (await import('./helpers.js')).setupProject;
  readDeployAliasesConfig = (await import('./helpers.js'))
    .readDeployAliasesConfig;
  findIfClassExtendsSmartContract = (await import('./helpers.js'))
    .findIfClassExtendsSmartContract;
});

beforeEach(() => {
  jest.clearAllMocks();
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    assert: jest.fn(),
  };
  jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
    if (path.includes('package.json')) {
      return JSON.stringify({ main: 'index.js' });
    } else if (path.endsWith('TestZkApp.js')) {
      return `
        import { SmartContract } from 'o1js';
        export class TestZkApp extends SmartContract {}
      `;
    } else if (path.endsWith('MultipleInheritance.js')) {
      return `
        import { SmartContract } from 'o1js';
        export class TestZkApp extends SmartContract {}
        export class ZkAppWithSecondInheritanceLevel extends TestZkApp {}
        export class ZkAppWithThirdInheritanceLevel extends ZkAppWithSecondInheritanceLevel {}
      `;
    } else if (path.endsWith('ZkAppWithSecondInheritanceLevel.js')) {
      return `
        import { TestZkApp } from './TestZkApp.js';
        export class ZkAppWithSecondInheritanceLevel extends TestZkApp {}
      `;
    } else if (path.endsWith('ZkAppWithThirdInheritanceLevel.js')) {
      return `
        import { ZkAppWithSecondInheritanceLevel } from './ZkAppWithSecondInheritanceLevel.js';
        export class ZkAppWithThirdInheritanceLevel extends ZkAppWithSecondInheritanceLevel {}
      `;
    } else if (path.endsWith('SomeLibOnFileSystem.js')) {
      return `
        export class SmartContract {}
      `;
    } else if (path.endsWith('NotO1jsSmartContractLib.js')) {
      return `
        import { SmartContract } from 'whatever';
        export class NotO1jsSmartContract extends SmartContract {}
      `;
    } else if (path.endsWith('NotO1jsSmartContractFs.js')) {
      return `
        import { SmartContract } from './SomeLibOnFileSystem.js';
        export class NotO1jsSmartContract extends SmartContract {}
      `;
    }
    return '';
  });
  jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
  jest.spyOn(fs, 'readdirSync').mockImplementation(() => []);
  jest.spyOn(process, 'exit').mockImplementation(() => {});
  shell.pwd.mockReturnValue({ toString: () => '/current/dir' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('step()', () => {
  it('should not call process.exit(1) if an error occurs and exitOnError is false', async () => {
    const errorFn = jest.fn().mockImplementation(async () => {
      throw new Error('Test error');
    });

    await step('Test Step', errorFn, false);

    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Test Step') })
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Test error')
    );
    expect(process.exit).not.toHaveBeenCalledWith(1);
  });
});

describe('setupProject()', () => {
  it('should set up the project correctly for TypeScript', async () => {
    const result = await setupProject('/path/to/project', 'ts');

    expect(shell.pwd).toHaveBeenCalled();
    expect(shell.mkdir).toHaveBeenCalledWith('-p', '/path/to/project');
    expect(shell.cd).toHaveBeenCalledWith('/path/to/project');
    expect(fs.cpSync).toHaveBeenCalledWith(
      expect.stringContaining('project-ts'),
      '/path/to/project/',
      { recursive: true }
    );
    expect(shell.mv).toHaveBeenCalledWith(
      expect.stringContaining('.gitignore'),
      expect.stringContaining('/path/to/project/.gitignore')
    );
    expect(shell.mv).toHaveBeenCalledWith(
      expect.stringContaining('.npmignore'),
      expect.stringContaining('/path/to/project/.npmignore')
    );
    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Set up project'),
      })
    );
    expect(result).toBe(true);
  });

  it('should set up the project correctly for JavaScript', async () => {
    const result = await setupProject('/path/to/project', 'js');

    expect(shell.pwd).toHaveBeenCalled();
    expect(shell.mkdir).toHaveBeenCalledWith('-p', '/path/to/project');
    expect(shell.cd).toHaveBeenCalledWith('/path/to/project');
    expect(fs.cpSync).toHaveBeenCalledWith(
      expect.stringContaining('project'),
      '/path/to/project/',
      { recursive: true }
    );
    expect(shell.mv).toHaveBeenCalledWith(
      expect.stringContaining('.gitignore'),
      expect.stringContaining('/path/to/project/.gitignore')
    );
    expect(shell.mv).toHaveBeenCalledWith(
      expect.stringContaining('.npmignore'),
      expect.stringContaining('/path/to/project/.npmignore')
    );
    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Set up project'),
      })
    );
    expect(result).toBe(true);
  });

  it('should fail to set up the project if an error occurs', async () => {
    fs.cpSync.mockImplementationOnce(() => {
      throw new Error('fs.cpSync');
    });

    const result = await setupProject('/path/to/project');

    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Set up project'),
      })
    );
    expect(result).toBe(false);
  });

  it('should restore the current directory after setting up the project', async () => {
    await setupProject('/path/to/project', 'ts');
    expect(shell.cd).toHaveBeenCalledWith('/current/dir');
  });
});

describe('setProjectName()', () => {
  it('should replace placeholders in README.md and package.json and add start script', async () => {
    const originalReadmeContent =
      'This is a README with PROJECT_NAME placeholder';
    const originalPackageJsonContent = {
      name: 'package-name',
    };
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('README.md')) {
        return originalReadmeContent;
      }
      if (filePath.includes('package.json')) {
        return JSON.stringify(originalPackageJsonContent, null, 2);
      }
      return '';
    });
    let writtenReadmeContent;
    let writtenPackageJsonContent;
    fs.writeFileSync.mockImplementation((filePath, data) => {
      if (filePath.includes('README.md')) {
        writtenReadmeContent = data;
      }
      if (filePath.includes('package.json')) {
        writtenPackageJsonContent = data;
      }
    });
    const { setProjectName } = await import('./helpers.js');

    setProjectName('/path/to/project');

    expect(writtenReadmeContent).toContain(
      'This is a README with Project placeholder'
    );
    expect(JSON.parse(writtenPackageJsonContent).name).toBe('project');
  });
});

describe('readDeployAliasesConfig()', () => {
  it('should log an error and exit if config.json is not found (ENOENT)', () => {
    const enoentError = new Error('File not found');
    enoentError.code = 'ENOENT';
    fs.readFileSync.mockImplementation(() => {
      throw enoentError;
    });

    readDeployAliasesConfig('/path/to/project');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('config.json not found')
    );
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log an error and exit if there is a different error reading config.json', () => {
    const otherError = new Error('Some other error');
    fs.readFileSync.mockImplementation(() => {
      throw otherError;
    });

    readDeployAliasesConfig('/path/to/project');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Unable to read config.json.')
    );
    expect(console.error).toHaveBeenCalledWith(otherError);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should parse and return config if no error occurs', () => {
    const mockConfig = { key: 'value' };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = readDeployAliasesConfig('/path/to/project');

    expect(result).toEqual(mockConfig);
    expect(process.exit).not.toHaveBeenCalled();
  });
});

describe('replaceInFile()', () => {
  it('should replace text in file', async () => {
    fs.readFileSync.mockReturnValue('old text');
    const { replaceInFile } = await import('./helpers.js');

    replaceInFile('/path/to/file', 'old text', 'new text');

    expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file', 'utf8');
    expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/file', 'new text');
  });
});

describe('titleCase()', () => {
  it('should convert string to title case', async () => {
    const { titleCase } = await import('./helpers.js');
    const result = titleCase('hello-world');
    expect(result).toBe('Hello World');
  });
});

describe('kebabCase()', () => {
  it('should convert string to kebab case', async () => {
    const { kebabCase } = await import('./helpers.js');
    const result = kebabCase('Hello World');
    expect(result).toBe('hello-world');
  });
});

describe('SmartContract inheritance detection', () => {
  it('should identify classes extending SmartContract from o1js directly', async () => {
    fs.readdirSync.mockReturnValue(['TestZkApp.js']);
    const result = findIfClassExtendsSmartContract('./build/src/TestZkApp.js');
    expect(result).toEqual([
      { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
    ]);
  });

  it('should identify classes extending another class that extends SmartContract from o1js within the same file', async () => {
    fs.readdirSync.mockReturnValue(['MultipleInheritance.js']);

    const result = findIfClassExtendsSmartContract(
      './build/src/MultipleInheritance.js'
    );

    expect(result).toEqual([
      {
        className: 'TestZkApp',
        filePath: './build/src/MultipleInheritance.js',
      },
      {
        className: 'ZkAppWithSecondInheritanceLevel',
        filePath: './build/src/MultipleInheritance.js',
      },
      {
        className: 'ZkAppWithThirdInheritanceLevel',
        filePath: './build/src/MultipleInheritance.js',
      },
    ]);
  });

  it('should identify classes extending another class that extends SmartContract from o1js with imports across files', async () => {
    fs.readdirSync.mockReturnValue([
      'TestZkApp.js',
      'ZkAppWithSecondInheritanceLevel.js',
    ]);

    const resultForTestZkApp = findIfClassExtendsSmartContract(
      './build/src/TestZkApp.js'
    );

    expect(resultForTestZkApp).toEqual([
      { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
    ]);

    const resultForZkAppWithSecondInheritanceLevel =
      findIfClassExtendsSmartContract(
        './build/src/ZkAppWithSecondInheritanceLevel.js'
      );

    expect(resultForZkAppWithSecondInheritanceLevel).toEqual([
      {
        className: 'ZkAppWithSecondInheritanceLevel',
        filePath: './build/src/ZkAppWithSecondInheritanceLevel.js',
      },
    ]);

    const resultForZkAppWithThirdInheritanceLevel =
      findIfClassExtendsSmartContract(
        './build/src/ZkAppWithThirdInheritanceLevel.js'
      );

    expect(resultForZkAppWithThirdInheritanceLevel).toEqual([
      {
        className: 'ZkAppWithThirdInheritanceLevel',
        filePath: './build/src/ZkAppWithThirdInheritanceLevel.js',
      },
    ]);
  });

  it('should skip classes extending SmartContract not from o1js', async () => {
    fs.readdirSync.mockReturnValue(['NotO1jsSmartContractLib.js']);

    const result = findIfClassExtendsSmartContract(
      './build/src/NotO1jsSmartContractLib.js'
    );

    expect(result).toEqual([]);
  });

  it('should skip classes extending SmartContract not from o1js with imports across files', async () => {
    fs.readdirSync.mockReturnValue([
      'SomeLibOnFileSystem.js',
      'NotO1jsSmartContractFs.js',
    ]);

    const result = findIfClassExtendsSmartContract(
      './build/src/NotO1jsSmartContractFs.js'
    );

    expect(result).toEqual([]);
  });

  it('should return null for Node.js built-in modules', async () => {
    const { resolveModulePath } = await import('./helpers.js');

    const result = resolveModulePath('fs', '/base/path');

    expect(result).toBeNull();
  });

  it('should append .js extension if file does not exist and does not end with .js', async () => {
    const { resolveModulePath } = await import('./helpers.js');
    jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
      if (path.endsWith('.js')) {
        return true;
      }
      return false;
    });

    const result = resolveModulePath('./module', '/base/path');

    expect(result).toBe('/base/path/module.js');
  });

  it('should handle module not found in node_modules directory', async () => {
    const { resolveModulePath } = await import('./helpers.js');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const result = resolveModulePath('nonexistent-module', '/base/path');

    expect(console.error).toHaveBeenCalledWith(
      `Module 'nonexistent-module' not found in the './node_modules' directory.`
    );
    expect(result).toBeNull();
  });
});
