// Helpers extracted to improve testability.

import dns from 'node:dns';
import net from 'node:net';

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
 * Checks multiple ports for availability and identifies any that are not.
 * @param {number[]} ports An array of port numbers to check.
 * @returns {Promise<{error: boolean, message: string}>} A promise that resolves with an object containing an error flag and a message indicating the result.
 */
/* istanbul ignore next */
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
        `The following local ports are required but unavailable at this time: ${busyPorts.join(', ')}`.trim() +
        '\nYou can close applications that use these ports and try again.',
    };
  } else {
    return { error: false };
  }
}

/**
 * Checks if a single port is available.
 * @param {number} port The port number to check.
 * @returns {Promise<{port: number, busy: boolean}>} A promise that resolves with an object containing the port number and a boolean indicating if the port is busy.
 */
/* istanbul ignore next */
async function checkLocalPortAvailability(port) {
  const checkPort = (host) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, host);
      server.on('listening', () => {
        server.close();
        resolve({ port, host, busy: false });
      });
      server.on('error', () => {
        resolve({ port, host, busy: true });
      });
    });
  };
  const isLocalhostHasDifferentIp = async () => {
    return new Promise((resolve, reject) => {
      dns.lookup('localhost', { all: true }, (err, addresses) => {
        if (err) {
          reject(err);
          return;
        }
        const hasDifferentIp = addresses.some((lookUpAddress) => {
          return lookUpAddress.address !== '127.0.0.1';
        });
        resolve(hasDifferentIp);
      });
    });
  };

  // Check port on 127.0.0.1 first
  let result = await checkPort('127.0.0.1');
  if (result.busy) {
    return { port, busy: true };
  }

  // Check if localhost resolves to a different IP
  const localhostDifferent = await isLocalhostHasDifferentIp();
  if (localhostDifferent) {
    // If localhost resolves to a different IP, check the port on localhost
    result = await checkPort('localhost');
    if (result.busy) {
      return { port, busy: true };
    }
  }

  return { port, busy: false };
}
