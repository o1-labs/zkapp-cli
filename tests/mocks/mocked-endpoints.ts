import http, {
  IncomingMessage,
  RequestListener,
  Server,
  ServerResponse,
} from 'node:http';
import { TestConstants, generateRandomInt } from '../utils/common-utils.js';

const applicationName = '⚡️[Mocked Endpoints Service]';
const host = 'localhost';
const port = Number(
  process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
    TestConstants.mockedEndpointsServicePort
);

// Start the mocked endpoints service.
const server: Server = http.createServer(createRequestListener());
server.listen(port, host, () => {
  console.log(`${applicationName}: Is running on http://localhost:${port}`);
});

function createRequestListener(): RequestListener {
  return (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Content-Type', 'application/json');
    const endIndex: number =
      request.url && request.url.indexOf('?') === -1
        ? request.url.length
        : request.url?.indexOf('?') || 0;
    const requestUrl = request.url?.substring(0, endIndex) || '';

    switch (requestUrl) {
      case '/':
        rootRouteHandler(response);
        break;
      case '/graphql':
        graphQlRouteHandler(request, response);
        break;
      case '/acquire-account':
        accountAcquisitionRouteHandler(response);
        break;
      case '/release-account':
        accountReleaseRouteHandler(request, response);
        break;
      default:
        response.writeHead(404);
        response.end(JSON.stringify({ error: '404 Not Found' }));
        break;
    }
  };
}

function rootRouteHandler(response: ServerResponse): void {
  response.writeHead(200);
  response.end(JSON.stringify({ application: applicationName }));
}

function graphQlRouteHandler(
  request: IncomingMessage,
  response: ServerResponse
): void {
  if (request.method !== 'POST') {
    rootRouteHandler(response);
    return;
  }
  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  request.on('end', () => {
    try {
      const requestData = Buffer.concat(chunks).toString();
      const query: string = JSON.parse(requestData)
        .query.replace(/(?:\r\n|\r|\n)/g, '')
        .replace(/\s{2,}/g, ' ');

      if (query.includes('{ syncStatus }')) {
        console.log('-> Mocking sync status GraphQL response');
        response.writeHead(200);
        response.end(JSON.stringify(TestConstants.syncStatusGraphQlResponse));
      } else if (query.includes('{ nonce }')) {
        console.log('-> Mocking nonce fetching GraphQL response');
        response.writeHead(200);
        response.end(
          JSON.stringify(TestConstants.nonceFetchingGraphQlResponse)
        );
      } else if (query.includes(' zkappState ')) {
        const startIndex = query.indexOf('publicKey: "') + 12;
        const publicKey = query.substring(startIndex, startIndex + 55);
        console.log('-> Mocking account details fetching GraphQL response');
        response.writeHead(200);
        response.end(
          JSON.stringify(
            TestConstants.getAccountDetailsFetchingGraphQlResponse(publicKey)
          )
        );
      } else if (query.includes(' zkappCommand: ')) {
        console.log('-> Mocking transaction GraphQL response');
        response.writeHead(200);
        response.end(
          JSON.stringify(TestConstants.zkAppTransactionGraphQlResponse)
        );
      } else if (
        query.includes(' pooledUserCommands ') ||
        query.includes(' pooledZkappCommands ')
      ) {
        console.log('-> Mocking mempool fetching GraphQL response');
        response.writeHead(200);
        response.end(JSON.stringify(TestConstants.mempoolGraphQlResponse));
      } else {
        rootRouteHandler(response);
      }
    } catch (error) {
      console.error('GraphQL route handler error.', error);
      response.writeHead(500);
      response.end(JSON.stringify({ error: '500 Internal Server Error' }));
    }
  });
}

function accountAcquisitionRouteHandler(response: ServerResponse): void {
  console.log('-> Mocking account acquisition response');
  response.writeHead(200);
  response.end(
    JSON.stringify(
      TestConstants.accounts[
        generateRandomInt(0, TestConstants.accounts.length - 1)
      ]
    )
  );
}

function accountReleaseRouteHandler(
  request: IncomingMessage,
  response: ServerResponse
): void {
  console.log('-> Mocking account release response');
  let publicKey = 'N/A';
  let requestData = '';

  request.on('data', (chunk: Buffer) => {
    requestData += chunk.toString();
    if (requestData.length > 1e7) {
      request.socket.destroy();
    }
  });
  request.on('end', () => {
    try {
      publicKey = JSON.parse(requestData).pk;
    } catch (_) {
      response.writeHead(500);
      response.end(
        JSON.stringify({
          message: `Account release route handler error.`,
        })
      );
    }
    response.writeHead(200);
    response.end(
      JSON.stringify({
        message: `Account with public key '${publicKey}' is set to be released.`,
      })
    );
  });
}
