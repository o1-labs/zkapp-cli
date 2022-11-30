const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');

const _red = chalk.red;
const _green = chalk.green;
const _i = chalk.italic;

/**
 * Create `foo.js` and `foo.test.js` in current directory. Warn if destination
 * already exists and do NOT overwrite.
 * @param {string} _path Desired file name or `path/to/name`
 * @return {Promise<void>}
 */
async function file(_path) {
  let { userPath, projName } = parsePath(process.cwd(), _path);

  // If we're in root dir, and the user didn't specify `src` as part of their
  // `path/to/name`, add it automatically for convenience.
  if (fs.existsSync('package.json') && !userPath.startsWith('src')) {
    userPath = path.join('src', userPath);
  }

  // TODO: Check if project is TS or JS
  const ts = true;

  const ext = ts ? 'ts' : 'js';
  const fileName = path.join(userPath, `${projName}.${ext}`);
  const testName = path.join(userPath, `${projName}.test.${ext}`);

  const fileExists = pathExists(fileName);
  const testExists = pathExists(testName);

  if (fileExists || testExists) {
    console.log(
      'Please choose a different name or delete the existing file' +
        (fileExists && testExists ? 's' : '')
    );
    return;
  }

  // TODO: Add SnarkyJS import to fileContent, when it's ready.
  const fileContent = ``;
  const testContent = `// import { ${projName} } from './${projName}';

describe('${projName}.js', () => {
  describe('${projName}()', () => {
    it.todo('should be correct');
  });
});
`;

  // Recursively creates path to file, if needed.
  fs.outputFileSync(fileName, fileContent);
  fs.outputFileSync(testName, testContent);

  console.log(`${_green('Created ' + fileName)}`);
  console.log(`${_green('Created ' + testName)}`);
}

/**
 * parsePath() parses cwd & user's desired name with optional path.
 * @param {string} cwd   Current working directory. E.g. process.cwd().
 * @param {string} _path User's desired filename with optional path.
 *                       E.g. `path/to/name` or `name` (with no path).
 * @returns {{fullPath: string, projName: string, userPath: string}}
 */
function parsePath(cwd, _path) {
  const fullPath = path.join(cwd, _path);

  const parts = _path.split(path.sep);
  const projName = parts.pop();

  const userPath = parts.length ? path.join(...parts) : '';

  return {
    fullPath,
    projName,
    userPath,
  };
}

/**
 * Check if file already exists.
 * @param {string} path  File name or `path/to/name`.
 * @return {boolean}
 */
function pathExists(path) {
  let exists;
  if (fs.existsSync(path)) {
    exists = true;
    console.error(_red(`"${_i(path)}" already exists`));
  }
  return exists;
}

module.exports = { file, parsePath, pathExists };
