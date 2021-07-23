const { file, parsePath, pathExists } = require('./file');

describe('file.js', () => {
  describe('file()', () => {
    it.todo('should be correct');
  });

  describe('parsePath()', () => {
    it('should be correct when given `name`', () => {
      const { fullPath, userName, userPath } = parsePath('/Users/Foo/', 'name');
      expect(fullPath).toEqual('/Users/Foo/name');
      expect(userName).toEqual('name');
      expect(userPath).toEqual('');
    });

    it('should be correct when given `path/to/name`', () => {
      const { fullPath, userName, userPath } = parsePath(
        '/Users/Foo/',
        'path/to/name'
      );
      expect(fullPath).toEqual('/Users/Foo/path/to/name');
      expect(userName).toEqual('name');
      expect(userPath).toEqual('path/to');
    });
  });

  describe('pathExists()', () => {
    it.todo('should be correct');
  });
});
