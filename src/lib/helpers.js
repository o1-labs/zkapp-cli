const ora = require('ora');
const { green, red } = require('chalk');

/**
 * Helper for any steps for a consistent UX.
 * @template T
 * @param {string} step  Name of step to show user.
 * @param {() => Promise<T>} fn  An async function to execute.
 * @returns {Promise<T>}
 */
async function step(str, fn) {
  // discardStdin prevents Ora from accepting input that would be passed to a
  // subsequent command, like a y/n confirmation step, which would be dangerous.
  const spin = ora({ text: `${str}...`, discardStdin: true }).start();
  try {
    const result = await fn();
    spin.succeed(green(str));
    return result;
  } catch (err) {
    spin.fail(str);
    console.error('  ' + red(err)); // maintain expected indentation
    process.exit(1);
  }
}

module.exports = {
  step,
};
