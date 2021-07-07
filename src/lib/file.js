const fs = require('fs');
const chalk = require('chalk');

const _red = chalk.red;
const _green = chalk.green;
const _i = chalk.italic;

// Create `foo.js` and `foo.test.js` in current directory. Warn if already
// exists and do NOT overwrite.
// TODO: Handle if user provides path/to/name.
module.exports = async function (name) {
  const fileName = `${name}.js`;
  const testName = `${name}.test.js`;

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
