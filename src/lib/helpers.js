const ora = require('ora');
const { green, red } = require('chalk');
const { spawnSync } = require('child_process');

/**
 * Helper for any steps for a consistent UX.
 * @template T
 * @param {string} step  Name of step to show user.
 * @param {() => Promise<T>} fn  An async function to execute.
 * @returns {Promise<T>}
 */
async function step(str, fn) {
  const spin = ora(`${str}...`).start();
  try {
    const result = await fn();
    spin.succeed(green(str));
    return result;
  } catch (err) {
    spin.fail(str);
    console.error('  ' + red(err)); // maintain expected indentation
    process.exit();
  }
}

async function stepInteractive(str, fn) {
  console.log(`${str}...`);

  const ls = spawnSync('npm', ['create', 'svelte@latest', 'ui'], {
    // const ls = spawn('npm', ['create', 'svelte@latest', 'ui'], {
    stdio: 'inherit',
  });

  // ls.stdout.on('data', (data) => {
  //   console.log(`stdout: ${data}`);
  // });

  // ls.on('close', (code) => {
  //   console.log(`child process close all stdio with code ${code}`);
  // });

  ls.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
    fn();
  });

  // console.log(`${str}...`);
  // try {
  //   const result = await fn();
  //   green(str);
  //   // ora(`${str}...`).succeed();
  //   return result;
  // } catch (err) {
  //   // ora.fail(str);
  //   console.error('  ' + red(err)); // maintain expected indentation
  //   process.exit();
  // }
}

module.exports = {
  step,
  stepInteractive,
};
