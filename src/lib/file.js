const fs = require('fs');
const chalk = require('chalk');

const _red = chalk.red;
const _green = chalk.green;
const _i = chalk.italic;

/**
 * Create `foo.js` and `foo.test.js` in current directory. Warn if dir already
 * exists and do NOT overwrite.
 * @param {string} name Desired file name.
 * @return {void}
 */
module.exports = async function (name) {
  // If we're in the project root, create files in `/src`. Otherwise, create
  // wherever the user is because they could be in `/src/foo`, etc).
  let fileName = `src/${name}.js`;
  let testName = `src/${name}.test.js`;
  if (!fs.existsSync('src')) {
    fileName = fileName.replace('src/', '');
    testName = testName.replace('src/', '');
  }

  let fileExists = true;
  try {
    fs.accessSync(fileName, fs.constants.F_OK);
    console.error(_red(`"${_i(fileName)}" already exists`));
  } catch (err) {
    fileExists = false;
  }

  let testExists = true;
  try {
    fs.accessSync(testName, fs.constants.F_OK);
    console.error(_red(`"${_i(testName)}" already exists`));
  } catch (err) {
    testExists = false;
  }

  if (fileExists || testExists) {
    console.log(
      'Please choose a different name or delete the existing file' +
        (fileExists && testExists ? 's' : '')
    );
    return;
  }

  // TODO: Finish templates when SnarkyJS is ready.
  const fileContent = ``;
  const testContent = `import ${name} from './${fileName}';\n`;

  fs.writeFileSync(fileName, fileContent, 'utf8');
  fs.writeFileSync(testName, testContent, 'utf8');

  console.log(`${_green('Created ' + fileName)}`);
  console.log(`${_green('Created ' + testName)}`);
};
