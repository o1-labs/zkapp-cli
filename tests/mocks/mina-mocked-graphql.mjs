import http from 'node:http';
import { Constants } from '../utils/common-utils.mjs';
import { getMinaMockedGraphQlEndpoint } from '../utils/network-utils.mjs';

const applicationName = '⚡️[Mina Mocked GraphQL]';
const host = 'localhost';
const port =
  process.env.MINA_MOCKED_GRAPHQL_PORT ?? Constants.MINA_MOCKED_GRAPHQL_PORT;

const requestListener = function (request, response) {
  response.setHeader('Content-Type', 'application/json');

  switch (request.url) {
    case '/': {
      response.writeHead(200);
      response.end(JSON.stringify({ application: applicationName }));
      break;
    }
    case '/graphql': {
      if (request.method !== 'POST') {
        response.writeHead(405);
        response.end(JSON.stringify({ error: '405 Method Not Allowed' }));
      } else {
        request.on('data', function (chunk) {
          const query = JSON.parse(chunk)
            .query.replace(/(?:\r\n|\r|\n)/g, '')
            .replace(/\s{2,}/g, ' ');
          // console.log(`-- -> Received query: ${query}`);

          if (query.includes('{ syncStatus }')) {
            console.log('-> Mocking sync status response');
            response.writeHead(200);
            response.end(
              JSON.stringify(Constants.GRAPHQL_SYNC_STATUS_RESPONSE)
            );
          } else if (query.includes('{ nonce }')) {
            console.log('-> Mocking nonce fetching response');
            response.writeHead(200);
            response.end(
              JSON.stringify(Constants.GRAPHQL_NONCE_FETCHING_RESPONSE)
            );
          } else if (query.includes(' zkappState ')) {
            const startIndex = query.indexOf('publicKey: "') + 12;
            const publicKey = query.substring(startIndex, startIndex + 55);

            console.log('-> Mocking account details fetching response');
            response.writeHead(200);
            response.end(
              JSON.stringify(
                Constants.getGraphQlAccountDetailsFetchingResponse(publicKey)
              )
            );
          } else if (query.includes(' zkappCommand: ')) {
            console.log('-> Mocking transaction response');
            response.writeHead(200);
            response.end(
              JSON.stringify(Constants.GRAPHQL_TRANSACTION_RESPONSE)
            );
          }
        });
      }
      break;
    }
    default: {
      response.writeHead(404);
      response.end(JSON.stringify({ error: '404 Not Found' }));
    }
  }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(
    `${applicationName}: Is running on ${getMinaMockedGraphQlEndpoint()}`
  );
});
