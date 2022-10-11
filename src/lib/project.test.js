const fs = require('fs');
const path = require('path');
let {
  setProjectName,
  replaceInFile,
  titleCase,
  kebabCase,
} = require('./project');

describe('project.js', () => {
  describe('project()', () => {
    it.todo('should be tested');
  });

  describe('step()', () => {
    it.todo('should be tested');
  });

  describe('setProjectName()', () => {
    it('README.md contains target text to replace', () => {
      const readmeTs = fs.readFileSync(
        path.join('templates', 'project-ts', 'README.md')
      );
      expect(readmeTs.includes('Mina zkApp: PROJECT_NAME')).toBeTruthy();
    });

    it('package.json contains target text to replace', () => {
      const readmeTs = fs.readFileSync(
        path.join('templates', 'project-ts', 'package.json')
      );
      expect(readmeTs.includes('package-name')).toBeTruthy();
    });

    it('should replace text in README.md & package.json', () => {
      const DIR = 'temp-fixture-proj';
      const NAME = 'my-cool-zkapp';

      const README = '# Mina zkApp: PROJECT_NAME\n more stuff\n and more';
      const PKG = `{"name": "package-name","version": "0.1.0"}`;
      fs.mkdirSync('temp-fixture-proj', { recursive: true });
      fs.writeFileSync(DIR + '/README.md', README);
      fs.writeFileSync(DIR + '/package.json', PKG);

      setProjectName(DIR, NAME);

      const readmeAfter = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
      expect(readmeAfter.includes('My Cool Zkapp')).toBeTruthy();
      expect(readmeAfter.includes('PROJECT_NAME')).toBeFalsy();
      const packageAfter = fs.readFileSync(
        path.join(DIR, 'package.json'),
        'utf8'
      );
      expect(packageAfter.includes('my-cool-zkapp')).toBeTruthy();
      expect(packageAfter.includes('package-name')).toBeFalsy();
      fs.rmSync(DIR, { recursive: true });
    });
  });

  describe('replaceInFile()', () => {
    it('should replace target content in a file', () => {
      const file = 'tmp-fixture-file';
      const str = '# Mina zkApp: PROJECT_NAME\n more stuff';
      fs.writeFileSync(file, str);
      replaceInFile(file, 'PROJECT_NAME', 'Foo Bar');
      const result = fs.readFileSync(file, 'utf8');
      expect(result.includes('Foo Bar')).toBeTruthy();
      expect(result.includes('PROJECT_NAME')).toBeFalsy();
      fs.unlinkSync(file);
    });
  });

  describe('titleCase()', () => {
    it('should return text as Title Case', () => {
      expect(titleCase('project-name')).toEqual('Project Name');
    });
  });

  describe('kebabCase()', () => {
    it('should return text as kebab-case', () => {
      expect(kebabCase('Project name')).toEqual('project-name');
    });
  });
});
