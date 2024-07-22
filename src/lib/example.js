import chalk from 'chalk';
import enquirer from 'enquirer';
import fs from 'fs-extra';
import path from 'node:path';
import url from 'node:url';
import util from 'node:util';
import ora from 'ora';
import shell from 'shelljs';
import Constants from './constants.js';
import { isDirEmpty, setProjectName, setupProject, step } from './helpers.js';

// Module external API
export default example;

// Module internal API (exported for testing purposes)
export { addStartScript, findUniqueDir, updateExampleSources };

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shellExec = util.promisify(shell.exec);

/**
 * Create a new zkApp project with recommended dir structure, Prettier config,
 * testing lib, etc. Warns if already exists and does NOT overwrite.
 * @param {string} name  Desired dir name or path. Will recursively create
 *                       dirs without overwriting existing content, if needed.
 * @return {Promise<void>}
 */
async function example(example) {
  if (!shell.which('git')) {
    console.error(chalk.red('Please ensure Git is installed, then try again.'));
    shell.exit(1);
  }

  if (!example) {
    const res = await enquirer.prompt({
      type: 'select',
      name: 'example',
      choices: Constants.exampleTypes,
      message: (state) => {
        const style =
          state.submitted && !state.cancelled
            ? state.styles.success
            : chalk.reset;
        return style('Choose an example');
      },
      prefix: (state) => {
        // Shows a cyan question mark when not submitted.
        // Shows a green check mark if submitted.
        // Shows a red "x" if ctrl+C is pressed (default is a magenta).
        if (!state.submitted) return state.symbols.question;
        return !state.cancelled
          ? state.symbols.check
          : chalk.red(state.symbols.cross);
      },
    });
    example = res.example;
  }

  const dir = findUniqueDir(example);
  const isWindows = process.platform === 'win32';

  if (!(await setupProject(path.join(shell.pwd().toString(), dir)))) {
    shell.exit(1);
  }
  if (!(await updateExampleSources(example, dir))) {
    shell.exit(1);
  }

  // Set dir for shell commands. Doesn't change user's dir in their CLI.
  shell.cd(dir);

  await step('Initialize Git repo', async () => {
    await shellExec('git init -q');
  });

  await step('Set project name', async () => {
    setProjectName(process.cwd());
  });

  await step('Update scripts', async () => {
    addStartScript(path.join(process.cwd(), 'package.json'));
  });

  await step('NPM install', async () => {
    await shellExec(
      `npm install --silent > ${isWindows ? 'NUL' : '"/dev/null" 2>&1'}`
    );
  });

  await step('Git init commit', async () => {
    await shellExec(
      'git add . && git commit -m "Init commit" -q -n && git branch -m main'
    );
  });

  const str =
    `\nSuccess!\n` +
    `\nNext steps:` +
    `\n  cd ${dir}` +
    `\n  git remote add origin <your-repo-url>` +
    `\n  git push -u origin main` +
    `\n` +
    `\nTo run the example:` +
    `\n  cd ${dir}` +
    `\n  npm run test` +
    `\n  npm run build` +
    `\n  npm run start`;

  console.log(chalk.green(str));
  process.exit(0);
}

/**
 * Helper to add start script to package.json.
 * @param {string} file Path to file
 */
function addStartScript(file) {
  let packageJsonContent = fs.readJsonSync(file, 'utf8');
  packageJsonContent['scripts']['start'] = 'node build/src/run.js';
  fs.writeJsonSync(file, packageJsonContent, { spaces: 2 });
}

/**
 * Updates the example sources.
 * @param {string} example     Name of the example.
 * @param {string} name        Destination dir name.
 * @param {string} lang        ts (default) or js
 * @returns {Promise<boolean>} True if successful; false if not.
 */
async function updateExampleSources(example, name, lang = 'ts') {
  const step = 'Update example sources';
  const spin = ora(`${step}...`).start();

  try {
    const examplePath = path.resolve(
      __dirname,
      '..',
      '..',
      'examples',
      example,
      lang,
      'src'
    );

    // Example not found. Delete the project template & temp dir to clean up.
    if (isDirEmpty(examplePath)) {
      spin.fail(step);
      console.error(chalk.red('Example not found'));
      return false;
    }

    // Delete the project template's `src` & use the example's `src` instead.
    const srcPath = path.resolve(name, 'src');
    shell.rm('-r', srcPath);
    // `node:fs.cpSync` instead of the `shell.cp` because `ShellJS` does not implement `cp -a`
    // https://github.com/shelljs/shelljs/issues/79#issuecomment-30821277
    fs.cpSync(`${examplePath}/`, `${srcPath}/`, { recursive: true });
    spin.succeed(chalk.green(step));
    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  }
}

/**
 * Given a specified directory name, will return that dir name if it is available,
 * or the next next available dir name with a numeric suffix: <dirName><#>.
 * @param {string} str Desired dir name.
 * @param {number} i   Counter for the recursive function.
 * @return {string}    An unused directory name.
 */
function findUniqueDir(str, i = 0) {
  const dir = str + (i || '');
  if (fs.existsSync(dir)) {
    return findUniqueDir(str, ++i);
  }
  return dir;
}
