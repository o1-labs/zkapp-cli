import { jest } from '@jest/globals';

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    existsSync: jest.fn(),
  },
}));

let fs, findIfClassExtendsOrImplementsSmartContract;

beforeAll(async () => {
  fs = (await import('node:fs')).default;
  findIfClassExtendsOrImplementsSmartContract = (await import('./helpers.js'))
    .findIfClassExtendsOrImplementsSmartContract;
});

beforeEach(() => {
  jest.clearAllMocks();
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
});

afterEach(() => {
  jest.restoreAllMocks();
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
    const result = findIfClassExtendsOrImplementsSmartContract(
      './build/src/TestZkApp.js'
    );
    expect(result).toEqual([
      { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
    ]);
  });

  it('should identify classes extending another class that extends SmartContract from o1js within the same file', async () => {
    fs.readdirSync.mockReturnValue(['MultipleInheritance.js']);
    const result = findIfClassExtendsOrImplementsSmartContract(
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
    const resultForTestZkApp = findIfClassExtendsOrImplementsSmartContract(
      './build/src/TestZkApp.js'
    );
    expect(resultForTestZkApp).toEqual([
      { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
    ]);

    const resultForZkAppWithSecondInheritanceLevel =
      findIfClassExtendsOrImplementsSmartContract(
        './build/src/ZkAppWithSecondInheritanceLevel.js'
      );
    expect(resultForZkAppWithSecondInheritanceLevel).toEqual([
      {
        className: 'ZkAppWithSecondInheritanceLevel',
        filePath: './build/src/ZkAppWithSecondInheritanceLevel.js',
      },
    ]);

    const resultForZkAppWithThirdInheritanceLevel =
      findIfClassExtendsOrImplementsSmartContract(
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
    const result = findIfClassExtendsOrImplementsSmartContract(
      './build/src/NotO1jsSmartContractLib.js'
    );
    expect(result).toEqual([]);
  });

  it('should skip classes extending SmartContract not from o1js with imports across files', async () => {
    fs.readdirSync.mockReturnValue([
      'SomeLibOnFileSystem.js',
      'NotO1jsSmartContractFs.js',
    ]);
    const result = findIfClassExtendsOrImplementsSmartContract(
      './build/src/NotO1jsSmartContractFs.js'
    );
    expect(result).toEqual([]);
  });
});
