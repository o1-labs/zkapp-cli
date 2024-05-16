import fs from 'fs';
import path from 'path';
import {
  kebabCase,
  replaceInFile,
  setProjectName,
  titleCase,
} from './project.js';

describe('project.js', () => {
  describe('project()', () => {
    it.todo('should be tested');
  });

  describe('step()', () => {
    it.todo('should be tested');
  });

  describe('setProjectName()', () => {
    const DIR = 'temp-fixture-proj';
    const NAME = 'my-cool-zkapp';
    const TEMPLATE_DIR = 'templates/project-ts';

    beforeAll(() => {
      fs.copyFileSync(
        path.join(TEMPLATE_DIR, 'README.md'),
        path.join(TEMPLATE_DIR, 'README.md.bak')
      );
      fs.copyFileSync(
        path.join(TEMPLATE_DIR, 'package.json'),
        path.join(TEMPLATE_DIR, 'package.json.bak')
      );
    });

    afterAll(() => {
      fs.copyFileSync(
        path.join(TEMPLATE_DIR, 'README.md.bak'),
        path.join(TEMPLATE_DIR, 'README.md')
      );
      fs.copyFileSync(
        path.join(TEMPLATE_DIR, 'package.json.bak'),
        path.join(TEMPLATE_DIR, 'package.json')
      );
      fs.unlinkSync(path.join(TEMPLATE_DIR, 'README.md.bak'));
      fs.unlinkSync(path.join(TEMPLATE_DIR, 'package.json.bak'));
    });

    afterEach(() => {
      if (fs.existsSync(DIR)) {
        fs.rmSync(DIR, { recursive: true });
      }
    });

    it('README.md contains target text to replace', () => {
      const readme = fs.readFileSync(
        path.join(TEMPLATE_DIR, 'README.md'),
        'utf8'
      );
      expect(readme.includes('Mina zkApp: PROJECT_NAME')).toBeTruthy();
    });

    it('package.json contains target text to replace', () => {
      const packageJson = fs.readFileSync(
        path.join(TEMPLATE_DIR, 'package.json'),
        'utf8'
      );
      expect(packageJson.includes('package-name')).toBeTruthy();
    });

    it('should replace text in README.md & package.json', () => {
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(
        DIR + '/README.md',
        '# Mina zkApp: PROJECT_NAME\n more stuff\n and more'
      );
      fs.writeFileSync(
        DIR + '/package.json',
        `{"name": "package-name","version": "0.1.0"}`
      );

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
    });
  });

  describe('replaceInFile()', () => {
    const file = 'tmp-fixture-file';

    afterEach(() => {
      fs.unlinkSync(file);
    });

    it('should replace target content in a file', () => {
      const str = '# Mina zkApp: PROJECT_NAME\n more stuff';
      fs.writeFileSync(file, str);
      replaceInFile(file, 'PROJECT_NAME', 'Foo Bar');
      const result = fs.readFileSync(file, 'utf8');
      expect(result.includes('Foo Bar')).toBeTruthy();
      expect(result.includes('PROJECT_NAME')).toBeFalsy();
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
