const { file, parsePath, pathExists } = require('./file');

const isWindows = process.platform === 'win32';

describe('file.js', () => {
  describe('file()', () => {
    it.todo('should be correct');
  });

  describe('parsePath()', () => {
    it('should be correct when given `name`', () => {
      const { fullPath, userName, userPath } = parsePath('/Users/Foo/', 'name');
      const expectedFullPath = isWindows
        ? '\\Users\\Foo\\name'
        : '/Users/Foo/name';
      expect(fullPath).toEqual(expectedFullPath);
      expect(userName).toEqual('name');
      expect(userPath).toEqual('');
    });

    it('should be correct when given `path/to/name`', () => {
      const { fullPath, userName, userPath } = parsePath(
        '/Users/Foo/',
        'path/to/name'
      );
      const expectedFullPath = isWindows
        ? '\\Users\\Foo\\path\\to\\name'
        : '/Users/Foo/path/to/name';
      const expectedUserPath = isWindows ? 'path\\to' : 'path/to';
      expect(fullPath).toEqual(expectedFullPath);
      expect(userName).toEqual('name');
      expect(userPath).toEqual(expectedUserPath);
    });
  });

  describe('pathExists()', () => {
    it.todo('should be correct');
  });
});
