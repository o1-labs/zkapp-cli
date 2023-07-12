import http from 'node:http';
import { Constants, generateRandomInt } from '../utils/common-utils.mjs';

const applicationName = '⚡️[Mocked Endpoints Service]';
const host = 'localhost';
const port =
  process.env.MOCKED_ENDPOINTS_SERVICE_PORT ??
  Constants.mockedEndpointsServicePort;

function rootRouteHandler(response) {
  response.writeHead(200);
  response.end(JSON.stringify({ application: applicationName }));
}

function notFundRouteHandler(response) {
  response.writeHead(404);
  response.end(JSON.stringify({ error: '404 Not Found' }));
}

function internalErrorRouteHandler(response) {
  response.writeHead(500);
  response.end(JSON.stringify({ error: '500 Internal Server Error' }));
}

function syncStatusGraphQlResponseHandler(response) {
  console.log('-> Mocking sync status GraphQL response');
  response.writeHead(200);
  response.end(JSON.stringify(Constants.syncStatusGraphQlResponse));
}

function nonceFetchingGraphQlResponseHandler(response) {
  console.log('-> Mocking nonce fetching GraphQL response');
  response.writeHead(200);
  response.end(JSON.stringify(Constants.nonceFetchingGraphQlResponse));
}

function accountDetailsFetchingGraphQlResponseHandler(query, response) {
  const startIndex = query.indexOf('publicKey: "') + 12;
  const publicKey = query.substring(startIndex, startIndex + 55);

  console.log('-> Mocking account details fetching GraphQL response');
  response.writeHead(200);
  response.end(
    JSON.stringify(
      Constants.getAccountDetailsFetchingGraphQlResponse(publicKey)
    )
  );
}

function zkAppTransactionGraphQlResponseHandler(response) {
  console.log('-> Mocking transaction GraphQL response');
  response.writeHead(200);
  response.end(JSON.stringify(Constants.zkAppTransactionGraphQlResponse));
}

function graphQlRouteHandler(request, response) {
  if (request.method !== 'POST') {
    rootRouteHandler(response);
  } else {
    const chunks = [];
    request.on('data', function (chunk) {
      chunks.push(chunk);
    });
    request.on('end', function () {
      try {
        let requestData = Buffer.concat(chunks);
        switch (request.headers['Content-Type']) {
          case 'application/json':
            requestData = requestData.toString();
            break;
        }
        const query = JSON.parse(requestData)
          .query.replace(/(?:\r\n|\r|\n)/g, '')
          .replace(/\s{2,}/g, ' ');

        if (query.includes('{ syncStatus }')) {
          syncStatusGraphQlResponseHandler(response);
        } else if (query.includes('{ nonce }')) {
          nonceFetchingGraphQlResponseHandler(response);
        } else if (query.includes(' zkappState ')) {
          accountDetailsFetchingGraphQlResponseHandler(query, response);
        } else if (query.includes(' zkappCommand: ')) {
          zkAppTransactionGraphQlResponseHandler(response);
        } else {
          rootRouteHandler(response);
        }
      } catch (_) {
        internalErrorRouteHandler(response);
      }
    });
  }
}

function accountAcquisitionRouteHandler(response) {
  console.log('-> Mocking account acquisition response');
  response.writeHead(200);
  response.end(
    JSON.stringify(
      Constants.accounts[generateRandomInt(0, Constants.accounts.length - 1)]
    )
  );
}

function accountReleaseRouteHandler(request, response) {
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
}

const requestListener = function (request, response) {
  response.setHeader('Content-Type', 'application/json');
  const endIndex =
    request.url.indexOf('?') === -1
      ? request.url.length
      : request.url.indexOf('?');
  const requestUrl = request.url.substring(0, endIndex);

  switch (requestUrl) {
    case '/': {
      rootRouteHandler(response);
      break;
    }
    case '/graphql': {
      graphQlRouteHandler(request, response);
      break;
    }
    case '/acquire-account': {
      accountAcquisitionRouteHandler(response);
      break;
    }
    case '/release-account': {
      accountReleaseRouteHandler(request, response);
      break;
    }
    default: {
      notFundRouteHandler(response);
      break;
    }
  }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`${applicationName}: Is running on http://localhost:${port}`);
});
