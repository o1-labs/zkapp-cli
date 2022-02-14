const ora = require('ora');
const { green, red } = require('chalk');

/**
 * Helper for any steps for a consistent UX.
 * @param {string} step  Name of step to show user.
 * @param {function} fn  An async function to execute.
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
  }
}

module.exports = {
  step,
};
