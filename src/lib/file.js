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
 * @return {void}
 */
async function file(_path) {
  let { fullPath, userPath, userName } = parsePath(process.cwd(), _path);

  // If we're in root dir, and the user didn't specify `src` as part of their
  // `path/to/name`, add it automatically for convenience.
  if (fs.existsSync('package.json') && !userPath.startsWith('src')) {
    userPath = path.join('src', userPath);
  }

  // TODO: Check if project is TS or JS
  const ts = true;

  const ext = ts ? 'ts' : 'js';
  const fileName = path.join(userPath, `${userName}.${ext}`);
  const testName = path.join(userPath, `${userName}.test.${ext}`);

  const fileExists = pathExists(fileName);
  const testExists = pathExists(testName);

  if (fileExists || testExists) {
    console.log(
      'Please choose a different name or delete the existing file' +
        (fileExists && testExists ? 's' : '')
    );
    return;
  }

  const fileContent = `import { Field } from '@o1labs/snarkyjs/server';`;
  const testContent = `import ${userName} from './${userName}';\n`;

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
 */
function parsePath(cwd, _path) {
  const fullPath = path.join(cwd, _path);

  const parts = _path.split(path.sep);
  const userName = parts.pop();

  const userPath = parts.length ? path.join(...parts) : '';

  return {
    fullPath,
    userPath,
    userName,
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
