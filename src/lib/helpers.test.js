import { jest } from '@jest/globals';

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
  },
}));

let fs;

beforeAll(async () => {
  fs = (await import('node:fs')).default;
});

beforeEach(() => {
  jest.clearAllMocks();
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
