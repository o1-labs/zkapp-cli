import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';

// Module external API
export default file;

// Module internal API (exported for testing purposes)
export { parsePath, pathExists };

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

  // TODO: https://github.com/o1-labs/zkapp-cli/issues/668
  const ts = fs.existsSync('tsconfig.json');
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
    process.exit(1);
  }

  const fileContent = `import * as o1js from 'o1js';\n`;
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

  console.log(`${chalk.green('Created ' + fileName)}`);
  console.log(`${chalk.green('Created ' + testName)}`);
}

/**
 * parsePath() parses cwd & user's specified name with optional path.
 * @param {string} cwd   Current working directory. E.g. process.cwd().
 * @param {string} _path User's specified filename with optional path.
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
    console.error(chalk.red(`"${chalk.italic(path)}" already exists`));
  }
  return exists;
}
