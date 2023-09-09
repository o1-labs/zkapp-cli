import { expect } from '@playwright/test';
import http from 'node:http';
import {
  Account,
  AccountDetails,
  Block,
  Mempool,
  Transaction,
} from '../models/types.js';
import { TestConstants } from './common-utils.js';

export function getMockedEndpointsServiceEndpoint(): string {
  return `http://localhost:${
    process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    TestConstants.mockedEndpointsServicePort
  }`;
}

export async function getMinaGraphQlEndpoint(): Promise<string> {
  const minaGraphQlEndpoint = `http://localhost:${
    process.env.MINA_GRAPHQL_PORT ?? TestConstants.minaGraphQlPort
  }/graphql`;

  return (await isEndpointAvailable(minaGraphQlEndpoint))
    ? minaGraphQlEndpoint
    : getMinaMockedGraphQlEndpoint();
}

export async function isMockedMinaGraphQlEndpointInUse(): Promise<boolean> {
  return (await getMinaGraphQlEndpoint()) === getMinaMockedGraphQlEndpoint();
}

export async function acquireAvailableAccount(
  isRegularAccount = true
): Promise<Account> {
  try {
    const endpoint =
      (await getMinaAccountsManagerEndpoint()) +
      `?isRegularAccount=${isRegularAccount}`;
    console.info(`Acquiring account using Mina Accounts-Manager: ${endpoint}`);
    const response = (await httpRequest('GET', endpoint)) as Account;
    console.info(`Mina Accounts-Manager response: ${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    console.error(`Failed to acquire account: ${error}`);
    throw error;
  }
}

export async function releaseAcquiredAccount(account: Account): Promise<void> {
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

export async function getMempoolTxns(): Promise<Transaction[]> {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: TestConstants.getMempoolTxnsQuery,
        variables: {},
        operationName: null,
      })
    );
    const mempool = response.data as Mempool;
    return mempool.pooledUserCommands.concat(mempool.pooledZkappCommands);
  } catch (error: any) {
    console.error(`Failed to get mempool transactions: ${error.message}`);
    return [];
  }
}

export async function getAccountDetails(
  publicKey: string
): Promise<AccountDetails | undefined> {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: TestConstants.getAccountDetailsQuery(publicKey),
        variables: {},
        operationName: null,
      })
    );
    return response.data.account as AccountDetails;
  } catch (error: any) {
    console.error(`Failed to get account details: ${error.message}`);
    return undefined;
  }
}

export async function getRecentBlocks(): Promise<Block[]> {
  try {
    const response = await httpRequest(
      'POST',
      await getMinaGraphQlEndpoint(),
      JSON.stringify({
        query: TestConstants.getRecentBlocksQuery(),
        variables: {},
        operationName: null,
      })
    );
    return response.data.bestChain as Block[];
  } catch (error: any) {
    console.error(`Failed to get recent blocks: ${error.message}`);
    return [];
  }
}

export async function findTxnByHash(
  txnHash: string
): Promise<Transaction | undefined> {
  const blocks = await getRecentBlocks();
  const transactions = (await getMempoolTxns())
    .concat(blocks.map((block) => block.transactions.zkappCommands).flat())
    .concat(blocks.map((block) => block.transactions.userCommands).flat());

  return transactions.find((transaction) => transaction.hash === txnHash);
}

export async function waitForTxnToBeAddedIntoBlock(
  txnHash: string
): Promise<void> {
  await expect
    .poll(
      async () => {
        console.info(
          `Waiting for transaction with hash ${txnHash} to be included into the block...`
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

function getValidUrlOrNull(url: string): URL | null {
  try {
    return new URL(url.trim());
  } catch (_) {
    return null;
  }
}

function isEndpointAvailable(
  url: string,
  isMinaGraphQlEndpoint = true
): Promise<boolean> {
  const validUrl = getValidUrlOrNull(url);
  if (!validUrl) return Promise.resolve(false);

  const { hostname, port, pathname } = validUrl;
  const options = {
    method: isMinaGraphQlEndpoint ? 'POST' : 'GET',
    hostname,
    port,
    path: pathname,
    headers: {
      'content-type': 'application/json',
      Accept: '*/*',
    },
    timeout: 30 * 1000,
  };

  return new Promise((resolve) => {
    const request = http.request(options, (response) =>
      resolve(/2\d\d/.test(`${response.statusCode}`) === true)
    );
    if (isMinaGraphQlEndpoint) {
      request.write(JSON.stringify({ query: 'query {syncStatus}' }));
    }
    request.on('timeout', () => resolve(false));
    request.on('error', () => resolve(false));
    request.end();
  });
}

function httpRequest(
  method: string,
  endpoint: string,
  data: string | null = null
): Promise<any> {
  const validUrl = getValidUrlOrNull(endpoint);
  if (!validUrl) {
    throw new Error(`Invalid endpoint: ${endpoint}`);
  }
  const { hostname, port, pathname, searchParams } = validUrl;
  const options = {
    method,
    hostname,
    port,
    path: pathname + `?${searchParams.toString()}`,
    headers: {
      'content-type': 'application/json',
      Accept: '*/*',
    },
    timeout: 30 * 1000,
  };

  return new Promise((resolve, reject) => {
    const request = http.request(options, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const responseData = Buffer.concat(chunks)
          .toString()
          .replace(/(?:\r\n|\r|\n)/g, '')
          .replace(/\s{2,}/g, ' ');
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

function getMinaMockedGraphQlEndpoint(): string {
  return `${getMockedEndpointsServiceEndpoint()}/graphql`;
}

async function getMinaAccountsManagerEndpoint(
  isForAccountAcquisition = true
): Promise<string> {
  const accountsManagerPort =
    process.env.MINA_ACCOUNTS_MANAGER_PORT ??
    TestConstants.minaAccountsManagerPort;
  const mockedAccountsManagerPort =
    process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    TestConstants.mockedEndpointsServicePort;
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
