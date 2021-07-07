const degit = require('degit');
const chalk = require('chalk');

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
  console.log('Creating new project...');

  const emitter = degit('jasongitmail/snapp-cli/templates/project#main', {
    cache: false,
    force: false,
  });

  emitter.on('err', (err) => {
    console.error(err.message);
    console.error(_red('Error: ' + err.code));
  });

  emitter
    .clone(name)
    .then(() => {
      console.log(_green('Project created successfully.'));
    })
    .catch((err) => {
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
