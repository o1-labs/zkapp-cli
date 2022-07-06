const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const sh = require('shelljs');
const util = require('util');
const gittar = require('gittar');

const _green = chalk.green;
const _red = chalk.red;
const shExec = util.promisify(sh.exec);

/**
 * Create a new zkApp project with recommended dir structure, Prettier config,
 * testing lib, etc. Warns if already exists and does NOT overwrite.
 * @param {string} name  Desired dir name or path. Will recursively create
 *                       dirs without overwriting existing content, if needed.
 * @return {Promise<void>}
 */
async function example(example) {
  const dir = findUniqueDir(example);
  const lang = 'ts';
  const isWindows = process.platform === 'win32';

  if (!(await fetchProjectTemplate(dir, lang))) return;
  if (!(await extractExample(example, dir, lang))) return;

  // Set dir for shell commands. Doesn't change user's dir in their CLI.
  sh.cd(dir);

  // Git must be initialized before running `npm install` b/c Husky runs an
  // NPM `prepare` script to set up its pre-commit hook within `.git`.
  if (!sh.which('git')) {
    console.error(_red('Please ensure Git is installed, then try again.'));
    return;
  }

  await step('Initialize Git repo', 'git init -q');

  // `/dev/null` on linux or 'NUL' on windows is the only way to silence Husky's install log msg.
  await step(
    'NPM install',
    `npm ci --silent > ${isWindows ? 'NUL' : '"/dev/null" 2>&1'}`
  );

  // process.cwd() is full path to user's terminal + path/to/name.
  await setProjectName(process.cwd());

  // `-n` (no verify) skips Husky's pre-commit hooks.
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

  console.log(_green(str));
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
    const src = 'github:o1-labs/zkapp-cli#main';
    await gittar.fetch(src, { force: true });

    // Note: Extract will overwrite any existing dir's contents. But we're
    // using an always-unique name.
    const TEMP = '.gittar-temp-dir';
    await gittar.extract(src, TEMP, {
      filter(path) {
        return path.includes(`templates/${projectName}/`);
      },
    });

    sh.mv(path.join(TEMP, 'templates', projectName), name);
    sh.rm('-r', TEMP);
    spin.succeed(_green(step));
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
async function step(step, cmd) {
  const spin = ora(`${step}...`).start();
  try {
    await shExec(cmd);
    spin.succeed(_green(step));
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
async function setProjectName(projDir) {
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

  spin.succeed(_green(step));
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
function replaceInFile(file, a, b) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(a, b);
  fs.writeFileSync(file, content);
}

function titleCase(str) {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
    .join(' ');
}

function kebabCase(str) {
  return str.toLowerCase().replace(' ', '-');
}

/**
 * Fetch an example & place in the `src` directory.
 * @param {string} example     Name of the example, as found in our Github repo.
 * @param {string} name        Destination dir name.
 * @param {string} lang        ts or js
 * @returns {Promise<boolean>} True if successful; false if not.
 */
async function extractExample(example, name, lang) {
  const step = 'Extract example';
  const spin = ora(`${step}...`).start();

  try {
    const src = 'github:o1-labs/zkapp-cli#main';

    // Note: Extract will overwrite any existing dir's contents. That's ok here.
    const TEMP = '.gittar-temp-dir';
    await gittar.extract(src, TEMP, {
      filter(path) {
        return path.includes(`examples/${example}/${lang}/src`);
      },
    });

    // Example not found. Delete the project template & temp dir to clean up.
    if (isEmpty(TEMP)) {
      spin.fail(step);
      console.error(_red('Example not found'));
      sh.rm('-r', `${process.cwd()}/${name}`, TEMP);
      return false;
    }

    // Delete the project template's `src` & use the example's `src` instead.
    sh.rm('-r', `${name}/src`);
    sh.mv(`${TEMP}/examples/${example}/${lang}/src`, `${name}/src`);
    sh.rm('-r', TEMP);
    spin.succeed(_green(step));
    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  }
}

function isEmpty(path) {
  return fs.readdirSync(path).length === 0;
}

/**
 * Given a desired directory name, will return that dir name if it is available,
 * or the next next available dir name with a numeric suffix: <dirName><#>.
 * @param {string} str Desired dir name.
 * @param {number} i   Counter for the recursive function.
 * @return {string}    An unused directory name.
 */
function findUniqueDir(str, i = 0) {
  const dir = str + (i ? i : '');
  if (fs.existsSync(dir)) {
    return findUniqueDir(str, ++i);
  }
  return dir;
}

module.exports = {
  example,
  step,
  setProjectName,
  replaceInFile,
  titleCase,
  kebabCase,
  extractExample,
  isEmpty,
  findUniqueDir,
};
