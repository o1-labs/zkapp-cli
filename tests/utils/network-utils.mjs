import http from 'node:http';
import { Constants } from './common-utils.mjs';

function getValidUrlOrNUll(url) {
  try {
    return new URL(url.trim());
  } catch (_) {
    return null;
  }
}

function isGraphQlEndpointAvailable(url) {
  const validUrl = getValidUrlOrNUll(url);
  if (!validUrl) return Promise.resolve(false);

  const { hostname, port, pathname } = validUrl;
  const options = {
    method: 'POST',
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
    request.write(JSON.stringify({ query: 'query {syncStatus}' }));
    request.end();
  });
}

export function getMinaMockedGraphQlEndpoint() {
  return `http://localhost:${
    process.env.MINA_MOCKED_GRAPHQL_PORT ?? Constants.MINA_MOCKED_GRAPHQL_PORT
  }/graphql`;
}

export async function getMinaGraphQlEndpoint() {
  const minaGraphQlEndpoint = `http://localhost:${
    process.env.MINA_GRAPHQL_PORT ?? Constants.MINA_GRAPHQL_PORT
  }/graphql`;

  return (await isGraphQlEndpointAvailable(minaGraphQlEndpoint))
    ? minaGraphQlEndpoint
    : getMinaMockedGraphQlEndpoint();
}
