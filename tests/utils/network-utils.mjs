import http from 'node:http';

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
    method: 'GET',
    hostname,
    port,
    path: pathname + '?query=' + encodeURIComponent('query {syncStatus}'),
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    timeout: 30 * 1000,
  };

  return new Promise((resolve) => {
    const req = http.request(options, (response) =>
      resolve(/2\d\d/.test(`${response.statusCode}`) === true)
    );
    req.on('timeout', () => resolve(false));
    req.on('error', () => resolve(false));
    req.end();
  });
}

export function getMinaMockedGraphQlEndpoint() {
  return `http://localhost:${
    process.env.MINA_MOCKED_GRAPHQL_PORT ?? 8282
  }/graphql`;
}

export async function getMinaGraphQlEndpoint() {
  const minaGraphQlEndpoint = `http://localhost:${
    process.env.MINA_GRAPHQL_PORT ?? 8080
  }/graphql`;
  const minaMockedGraphQlEndpoint = getMinaMockedGraphQlEndpoint();

  return (await isGraphQlEndpointAvailable(minaGraphQlEndpoint))
    ? minaGraphQlEndpoint
    : minaMockedGraphQlEndpoint;
}
