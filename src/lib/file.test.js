const path = require('path');
const { file, parsePath, pathExists } = require('./file');

describe('file.js', () => {
  describe('file()', () => {
    it.todo('should be correct');
  });

  describe('parsePath()', () => {
    it('should be correct when given `name`', () => {
      const { fullPath, projName, userPath } = parsePath(
        path.join('/Users', 'Foo'),
        'name'
      );
      const expectedFullPath = path.join('/Users', 'Foo', 'name');
      expect(fullPath).toEqual(expectedFullPath);
      expect(projName).toEqual('name');
      expect(userPath).toEqual('');
    });

    it('should be correct when given `path/to/name`', () => {
      const { fullPath, projName, userPath } = parsePath(
        path.join('/Users', 'Foo'),
        path.join('path', 'to', 'name')
      );
      const expectedFullPath = path.join('/Users', 'Foo', 'path', 'to', 'name');
      const expectedUserPath = path.join('path', 'to');
      expect(fullPath).toEqual(expectedFullPath);
      expect(projName).toEqual('name');
      expect(userPath).toEqual(expectedUserPath);
    });
  });

  describe('pathExists()', () => {
    it.todo('should be correct');
  });
});
