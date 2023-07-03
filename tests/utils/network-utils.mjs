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

function httpRequest(method, endpoint, data = null) {
  const { hostname, port, pathname, searchParams } =
    getValidUrlOrNUll(endpoint);
  const options = {
    method,
    hostname,
    port,
    path: pathname + `?${searchParams.toString()}`,
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    timeout: 30 * 1000,
  };

  return new Promise((resolve, reject) => {
    const request = http.request(options, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let responseData = Buffer.concat(chunks);
        switch (response.headers['Content-Type']) {
          case 'application/json':
            responseData = responseData.toString();
            break;
        }
        resolve(JSON.parse(responseData));
      });
    });
    request.on('error', reject);
    if (data) {
      request.write(JSON.stringify(data));
    }
    request.end();
  });
}

export function getMockedEndpointsServiceEndpoint() {
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

export async function acquireAvailableAccount(isRegularAccount = true) {
  const endpoint =
    (await getMinaAccountsManagerEndpoint()) +
    `?isRegularAccount=${isRegularAccount}`;
  console.info(`Acquiring account using Mina Accounts-Manager: ${endpoint}`);
  const response = await httpRequest('GET', endpoint);
  console.info(`Mina Accounts-Manager response: ${JSON.stringify(response)}`);
  return response;
}

export async function releaseAcquiredAccount(account) {
  const endpoint = await getMinaAccountsManagerEndpoint(false);
  console.info(
    `Releasing account with public key '${account.pk}' using Mina Accounts-Manager: ${endpoint}`
  );
  const response = await httpRequest('PUT', endpoint, account);
  console.info(`Mina Accounts-Manager response: ${JSON.stringify(response)}`);
}
