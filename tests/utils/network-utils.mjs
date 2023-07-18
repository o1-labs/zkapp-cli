import { expect } from '@playwright/test';
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
      request.write(data);
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

export async function isMockedMinaGraphQlEndpointInUse() {
  return (await getMinaGraphQlEndpoint()) === getMinaMockedGraphQlEndpoint();
}

export async function getMinaAccountsManagerEndpoint(
  isForAccountAcquisition = true
) {
  const accountsManagerPort =
    process.env.MINA_ACCOUNTS_MANAGER_PORT ?? Constants.minaAccountsManagerPort;
  const mockedAccountsManagerPort =
    process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    Constants.mockedEndpointsServicePort;
  const endpointAction = isForAccountAcquisition
    ? 'acquire-account'
    : 'release-account';
  const endpointPort = (await isEndpointAvailable(
    `http://localhost:${accountsManagerPort}`,
    false
  ))
    ? accountsManagerPort
    : mockedAccountsManagerPort;

  return `http://localhost:${endpointPort}/${endpointAction}`;
}

export async function acquireAvailableAccount(isRegularAccount = true) {
  try {
    const endpoint =
      (await getMinaAccountsManagerEndpoint()) +
      `?isRegularAccount=${isRegularAccount}`;
    console.info(`Acquiring account using Mina Accounts-Manager: ${endpoint}`);
    const response = await httpRequest('GET', endpoint);
    console.info(`Mina Accounts-Manager response: ${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    console.error(`Failed to acquire account: ${error}`);
    throw error;
  }
}

export async function releaseAcquiredAccount(account) {
  try {
    const endpoint = await getMinaAccountsManagerEndpoint(false);
    console.info(
      `Releasing account with public key '${account.pk}' using Mina Accounts-Manager: ${endpoint}`
    );
    const response = await httpRequest(
      'PUT',
      endpoint,
      JSON.stringify(account)
    );
    console.info(`Mina Accounts-Manager response: ${JSON.stringify(response)}`);
  } catch (error) {
    console.error(`Failed to release acquired account: ${error}`);
    throw error;
  }
}

export async function getMempoolTxns() {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: Constants.getMempoolTxnsQuery,
        variables: {},
        operationName: null,
      })
    );
    return response.data.pooledUserCommands.concat(
      response.data.pooledZkappCommands
    );
  } catch (error) {
    console.error(`Failed to get mempool transactions: ${error.message}`);
    return [];
  }
}

export async function getAccountDetails(publicKey) {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: Constants.getAccountDetailsQuery(publicKey),
        variables: {},
        operationName: null,
      })
    );
    return response.data.account;
  } catch (error) {
    console.error(`Failed to get account details: ${error.message}`);
    return undefined;
  }
}

export async function getRecentBlocks() {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: Constants.getRecentBlocksQuery(),
        variables: {},
        operationName: null,
      })
    );
    return response.data.bestChain;
  } catch (error) {
    console.error(`Failed to get recent blocks: ${error.message}`);
    return [];
  }
}

export async function findTxnByHash(txnHash) {
  const blocks = await getRecentBlocks();
  const txns = (await getMempoolTxns())
    .concat(blocks.map((block) => block.transactions.zkappCommands).flat())
    .concat(blocks.map((block) => block.transactions.userCommands).flat());

  return txns.find((txn) => txn.hash === txnHash);
}

export async function waitForTxnToBeMined(txnHash) {
  await expect
    .poll(
      async () => {
        console.info(
          `Waiting for transaction with hash ${txnHash} to be mined...`
        );
        return (await getMempoolTxns()).map((transaction) => transaction.hash);
      },
      {
        intervals: [3_000, 5_000, 10_000],
        timeout: 10 * 60 * 1000,
      }
    )
    .not.toContain(txnHash);
}
