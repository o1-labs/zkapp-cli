import chalk from 'chalk';
import enquirer from 'enquirer';
import fs from 'fs-extra';
import gittar from 'gittar';
import ora from 'ora';
import path from 'path';
import shell from 'shelljs';
import util from 'util';
import Constants from './constants.js';

const shellExec = util.promisify(shell.exec);

/**
 * Create a new zkApp project with recommended dir structure, Prettier config,
 * testing lib, etc. Warns if already exists and does NOT overwrite.
 * @param {string} name  Desired dir name or path. Will recursively create
 *                       dirs without overwriting existing content, if needed.
 * @return {Promise<void>}
 */
export async function example(example) {
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
  const lang = 'ts';
  const isWindows = process.platform === 'win32';

  if (!(await fetchProjectTemplate(dir, lang))) return;

  if (!(await extractExample(example, dir, lang))) return;

  // Set dir for shell commands. Doesn't change user's dir in their CLI.
  shell.cd(dir);

  if (!shell.which('git')) {
    console.error(chalk.red('Please ensure Git is installed, then try again.'));
    return;
  }

  await step('Initialize Git repo', 'git init -q');

  await step(
    'NPM install',
    `npm install --silent > ${isWindows ? 'NUL' : '"/dev/null" 2>&1'}`
  );

  // process.cwd() is full path to user's terminal + path/to/name.
  await setProjectName(process.cwd());

  await step(
    'Git init commit',
    'git add . && git commit -m "Init commit" -q -n && git branch -m main'
  );

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
 * Fetch project template.
 * @param {string} example     Name of the destination dir.
 * @param {string} lang        ts or js
 * @returns {Promise<boolean>} True if successful; false if not.
 */
async function fetchProjectTemplate(name, lang) {
  const projectName = lang === 'ts' ? 'project-ts' : 'project';
  const step = 'Fetch project template';
  const spin = ora(`${step}...`).start();

  try {
    const TEMP = '.temp-dir';
    const templatePath = `templates/${projectName}`;

    if (process.env.CI) {
      shell.mkdir('-p', path.join(TEMP, templatePath));
      shell.cp('-r', `${templatePath}/.`, path.join(TEMP, templatePath));
    } else {
      const src = 'github:o1-labs/zkapp-cli#main';
      await gittar.fetch(src, { force: true });

      // Note: Extract will overwrite any existing dir's contents. But we're
      // using an always-unique name.
      await gittar.extract(src, TEMP, {
        filter(path) {
          return path.includes(templatePath);
        },
      });
    }

    shell.mv(path.join(TEMP, templatePath), name);
    shell.rm('-r', TEMP);
    spin.succeed(chalk.green(step));
    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  }
}

/**
 * Helper for any steps that need to call a shell command.
 * @param {string} step Name of step to show user
 * @param {string} cmd  Shell command to execute.
 * @returns {Promise<void>}
 */
export async function step(step, cmd) {
  const spin = ora(`${step}...`).start();
  try {
    await shellExec(cmd);
    spin.succeed(chalk.green(step));
  } catch (err) {
    spin.fail(step);
  }
}

/**
 * Step to replace placeholder names in the project with the properly-formatted
 * version of the user-supplied name as specified via `zk project <name>`
 * @param {string} projDir Full path to terminal dir + path/to/name
 * @returns {Promise<void>}
 */
export async function setProjectName(projDir) {
  const step = 'Set project name';
  const spin = ora(`${step}...`).start();

  const name = projDir.split(path.sep).pop();
  replaceInFile(
    path.join(projDir, 'README.md'),
    'PROJECT_NAME',
    titleCase(name)
  );

  replaceInFile(
    path.join(projDir, 'package.json'),
    'package-name',
    kebabCase(name)
  );

  addStartScript(path.join(projDir, 'package.json'));

  spin.succeed(chalk.green(step));
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
 * Helper to replace text in a file.
 * @param {string} file Path to file
 * @param {string} a    Old text.
 * @param {string} b    New text.
 */
export function replaceInFile(file, a, b) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(a, b);
  fs.writeFileSync(file, content);
}

export function titleCase(str) {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
    .join(' ');
}

export function kebabCase(str) {
  return str.toLowerCase().replace(' ', '-');
}

/**
 * Fetch an example & place in the `src` directory.
 * @param {string} example     Name of the example, as found in our GitHub repo.
 * @param {string} name        Destination dir name.
 * @param {string} lang        ts or js
 * @returns {Promise<boolean>} True if successful; false if not.
 */
export async function extractExample(example, name, lang) {
  const step = 'Extract example';
  const spin = ora(`${step}...`).start();

  try {
    const TEMP = '.temp-dir';
    const examplePath = `examples/${example}/${lang}/src`;

    if (process.env.CI) {
      shell.mkdir('-p', path.join(TEMP, examplePath));
      shell.cp('-r', `${examplePath}/.`, path.join(TEMP, examplePath));
    } else {
      const src = 'github:o1-labs/zkapp-cli#main';

      // Note: Extract will overwrite any existing dir's contents. That's ok here.
      await gittar.extract(src, TEMP, {
        filter(path) {
          return path.includes(examplePath);
        },
      });
    }

    // Example not found. Delete the project template & temp dir to clean up.
    if (isEmpty(TEMP)) {
      spin.fail(step);
      console.error(chalk.red('Example not found'));
      shell.rm('-r', `${process.cwd()}/${name}`, TEMP);
      return false;
    }

    // Delete the project template's `src` & use the example's `src` instead.
    shell.rm('-r', `${name}/src`);
    shell.mv(`${TEMP}/${examplePath}`, `${name}/src`);
    shell.rm('-r', TEMP);
    spin.succeed(chalk.green(step));
    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  }
}

export function isEmpty(path) {
  return fs.readdirSync(path).length === 0;
}

/**
 * Given a specified directory name, will return that dir name if it is available,
 * or the next next available dir name with a numeric suffix: <dirName><#>.
 * @param {string} str Desired dir name.
 * @param {number} i   Counter for the recursive function.
 * @return {string}    An unused directory name.
 */
export function findUniqueDir(str, i = 0) {
  const dir = str + (i ? i : '');
  if (fs.existsSync(dir)) {
    return findUniqueDir(str, ++i);
  }
  return dir;
}
