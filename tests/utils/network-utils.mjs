import http from 'node:http';
import { Constants } from './common-utils.mjs';

function getValidUrlOrNUll(url) {
  try {
    return new URL(url.trim());
  } catch (_) {
    return null;
  }
}

function isEndpointAvailable(url, isMinaGraphQlEndpoint = true) {
  const validUrl = getValidUrlOrNUll(url);
  if (!validUrl) return Promise.resolve(false);

  const { hostname, port, pathname } = validUrl;
  const options = {
    method: isMinaGraphQlEndpoint ? 'POST' : 'GET',
    hostname,
    port,
    path: pathname,
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    timeout: 30 * 1000,
  };

  return new Promise((resolve) => {
    const request = http.request(options, (response) =>
      resolve(/2\d\d/.test(`${response.statusCode}`) === true)
    );
    request.on('timeout', () => resolve(false));
    request.on('error', () => resolve(false));
    if (isMinaGraphQlEndpoint) {
      request.write(JSON.stringify({ query: 'query {syncStatus}' }));
    }
    request.end();
  });
}

function getMockedEndpointsServiceEndpoint() {
  return `http://localhost:${
    process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    Constants.mockedEndpointsServicePort
  }`;
}

export function getMinaMockedGraphQlEndpoint() {
  return `${getMockedEndpointsServiceEndpoint()}/graphql`;
}

export async function getMinaGraphQlEndpoint() {
  const minaGraphQlEndpoint = `http://localhost:${
    process.env.MINA_GRAPHQL_PORT ?? Constants.minaGraphQlPort
  }/graphql`;

  return (await isEndpointAvailable(minaGraphQlEndpoint))
    ? minaGraphQlEndpoint
    : getMinaMockedGraphQlEndpoint();
}

export async function getMinaAccountsManagerEndpoint(
  isForAccountAcquisition = true
) {
  const accountsManagerPort =
    process.env.MINA_ACCOUNTS_MANAGER_PORT ?? Constants.minaAccountsManagerPort;
  const mockedAccountsManagerPort =
    process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    Constants.mockedEndpointsServicePort;

  if (isForAccountAcquisition) {
    return (await isEndpointAvailable(
      `http://localhost:${accountsManagerPort}`,
      false
    ))
      ? `http://localhost:${accountsManagerPort}/acquire-account`
      : `http://localhost:${mockedAccountsManagerPort}/acquire-account`;
  } else {
    return (await isEndpointAvailable(
      `http://localhost:${accountsManagerPort}`,
      false
    ))
      ? `http://localhost:${accountsManagerPort}/release-account`
      : `http://localhost:${mockedAccountsManagerPort}/release-account`;
  }
}
