import chalk from 'chalk';
import net from 'net';
import fetch from 'node-fetch';
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

/**
 * Checks the Mina GraphQL endpoint availability.
 * @param {endpoint} The GraphQL endpoint to check.
 * @returns {Promise<boolean>} Whether the endpoint is available.
 */
export async function isMinaGraphQlEndpointAvailable(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ syncStatus }' }),
    });
    return !!response.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Checks if a single port is available.
 * @param {number} port The port number to check.
 * @returns {Promise<{port: number, busy: boolean}>} A promise that resolves with an object containing the port number and a boolean indicating if the port is busy.
 */
export async function checkLocalPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1');
    server.on('listening', () => {
      server.close();
      resolve({ port, busy: false });
    });
    server.on('error', () => {
      resolve({ port, busy: true });
    });
  });
}

/**
 * Checks multiple ports for availability and identifies any that are not.
 * @param {number[]} ports An array of port numbers to check.
 * @returns {Promise<{error: boolean, message: string}>} A promise that resolves with an object containing an error flag and a message indicating the result.
 */
export async function checkLocalPortsAvailability(ports) {
  const checks = ports.map((port) => checkLocalPortAvailability(port));
  const results = await Promise.all(checks);
  const busyPorts = results
    .filter((result) => result.busy)
    .map((result) => result.port);
  if (busyPorts.length > 0) {
    return {
      error: true,
      message:
        `The following local ports are required but unavailable at this time: ${busyPorts.join(', ')}`.trim(),
    };
  } else {
    return { error: false };
  }
}

export default step;
