const chalk = require('chalk');
const degit = require('degit');
const ora = require('ora');
const shell = require('shelljs');
const util = require('util');

const _green = chalk.green;
const _red = chalk.red;

/**
 * Create a new SNAPP project with recommended dir structure, Prettier config,
 * testing lib, etc. Warns if already exists and does NOT overwrite.
 * @param {string} name  Desired dir name or path. Will recursively create
 *                       dirs without overwriting existing content, if needed.
 * @return {void}
 */
module.exports = function (name) {
  const emitter = degit('jasongitmail/snapp-cli/templates/project#main', {
    cache: true, // enabled to support offline usage
    force: false,
  });

  emitter.on('err', (err) => {
    console.error(err.message);
    console.error(_red('Error: ' + err.code));
  });

  const spin0 = ora('Clone project template...').start();

  emitter
    .clone(name)
    .then(async () => {
      spin0.succeed(_green('Clone project template'));

      // Set dir for shell commands. Doesn't change user's dir in their CLI.
      shell.cd(name);

      const shellExecAsync = util.promisify(shell.exec);

      const spin1 = ora('NPM install...').start();
      try {
        await shellExecAsync('npm ci --silent');
        spin1.succeed(_green('NPM install'));
      } catch (err) {
        spin1.fail();
      }

      if (shell.which('git')) {
        const spin2 = ora('Initialize Git repo...').start();
        shell.exec(
          `git init -q && git branch -m main && git add . && git commit -m 'Init commit' -q`
        );
        spin2.succeed(_green('Initialize Git repo'));
      }
      const str =
        `\nSuccess!\n` +
        `\nNext steps:` +
        `\n  cd ${name}` +
        `\n  git remote add origin <your-repo-url>` +
        `\n  git push -u origin main`;

      console.log(_green(str));
    })
    .catch((err) => {
      spin0.fail('Clone project template');

      if (err.code === 'DEST_NOT_EMPTY') {
        console.error(
          _red('Destination directory is not empty. Not proceeding.')
        );
      } else {
        console.error(err.message);
        console.error(_red('Error: ' + err.code));
      }
    });
};
