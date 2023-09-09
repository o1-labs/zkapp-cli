import chalk from 'chalk';
import ora from 'ora';

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
    spin.succeed(chalk.green(str));
    return result;
  } catch (err) {
    spin.fail(str);
    console.error('  ' + chalk.red(err)); // maintain expected indentation
    console.log(err);
    process.exit(1);
  }
}

export default step;
