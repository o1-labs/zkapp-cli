import http from 'node:http';
import { Constants, generateRandomInt } from '../utils/common-utils.mjs';

const applicationName = '⚡️[Mocked Endpoints Service]';
const host = 'localhost';
const port =
  process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
  Constants.mockedEndpointsServicePort;

const requestListener = function (request, response) {
  response.setHeader('Content-Type', 'application/json');
  const endIndex =
    request.url.indexOf('?') === -1
      ? request.url.length
      : request.url.indexOf('?');
  const requestUrl = request.url.substring(0, endIndex);

  switch (requestUrl) {
    case '/': {
      response.writeHead(200);
      response.end(JSON.stringify({ application: applicationName }));
      break;
    }
    case '/graphql': {
      if (request.method !== 'POST') {
        response.writeHead(200);
        response.end(JSON.stringify({ application: applicationName }));
      } else {
        let requestData = '';

        request.on('data', function (chunk) {
          requestData += chunk;
          if (requestData.length > 1e7) {
            request.connection.destroy();
          }
        });
        request.on('end', function () {
          try {
            const query = JSON.parse(requestData)
              .query.replace(/(?:\r\n|\r|\n)/g, '')
              .replace(/\s{2,}/g, ' ');

            if (query.includes('{ syncStatus }')) {
              console.log('-> Mocking sync status GraphQL response');
              response.writeHead(200);
              response.end(JSON.stringify(Constants.syncStatusGraphQlResponse));
            } else if (query.includes('{ nonce }')) {
              console.log('-> Mocking nonce fetching GraphQL response');
              response.writeHead(200);
              response.end(
                JSON.stringify(Constants.nonceFetchingGraphQlResponse)
              );
            } else if (query.includes(' zkappState ')) {
              const startIndex = query.indexOf('publicKey: "') + 12;
              const publicKey = query.substring(startIndex, startIndex + 55);

              console.log(
                '-> Mocking account details fetching GraphQL response'
              );
              response.writeHead(200);
              response.end(
                JSON.stringify(
                  Constants.getAccountDetailsFetchingGraphQlResponse(publicKey)
                )
              );
            } else if (query.includes(' zkappCommand: ')) {
              console.log('-> Mocking transaction GraphQL response');
              response.writeHead(200);
              response.end(
                JSON.stringify(Constants.transactionGraphQlResponse)
              );
            } else {
              response.writeHead(200);
              response.end(JSON.stringify({ application: applicationName }));
            }
          } catch (_) {
            response.writeHead(500);
            response.end(
              JSON.stringify({ error: '500 Internal Server Error' })
            );
          }
        });
      }
      break;
    }
    case '/acquire-account': {
      console.log('-> Mocking account acquisition response');
      response.writeHead(200);
      response.end(
        JSON.stringify(
          Constants.accounts[
            generateRandomInt(0, Constants.accounts.length - 1)
          ]
        )
      );
      break;
    }
    case '/release-account': {
      let publicKey = 'N/A';
      let requestData = '';

      console.log('-> Mocking account release response');
      request.on('data', function (chunk) {
        requestData += chunk;
        if (requestData.length > 1e7) {
          request.connection.destroy();
        }
      });
      request.on('end', function () {
        try {
          publicKey = JSON.parse(requestData).pk;
        } catch (_) {}

        response.writeHead(200);
        response.end(
          JSON.stringify({
            message: `Account with public key '${publicKey}' is set to be released.`,
          })
        );
      });
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
  console.log(`${applicationName}: Is running on http://localhost:${port}`);
});
