/**
 * This script can be used to interact with the Add contract, after deploying it.
 *
 * We call the settleState() method on the `Add` contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <deployAlias>`.
 */
import fs from 'fs/promises';
import { Mina, NetworkId, PrivateKey, fetchAccount } from 'o1js';
import { Add } from './Add.js';
import { AddZkProgram } from './AddZkProgram.js';

// check command line arg
const deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      networkId?: string;
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
const configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
const config = configJson.deployAliases[deployAlias];
const feepayerKeysBase58: { privateKey: string; publicKey: string } =
  JSON.parse(await fs.readFile(config.feepayerKeyPath, 'utf8'));

const zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

const feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
const zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network({
  // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
  // This is to ensure the backward compatibility.
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
const feepayerAddress = feepayerKey.toPublicKey();
const zkAppAddress = zkAppKey.toPublicKey();
const zkApp = new Add(zkAppAddress);

// compile the ZKprogram
console.log('compile the zkprogram...');
await AddZkProgram.compile();

// compile the contract to create prover keys
console.log('compile the contract...');
await Add.compile();

try {
  await fetchAccount({ publicKey: zkAppAddress });
  const initialState = zkApp.num.get();

  // initialze the ZKprogram
  const init = await AddZkProgram.init(initialState);
  // call update on the ZKprogram
  const update1 = await AddZkProgram.update(initialState, init.proof);
  const update2 = await AddZkProgram.update(initialState, update1.proof);

  // call settleState() and send transaction
  console.log('build transaction and create proof...');
  const tx = await Mina.transaction(
    { sender: feepayerAddress, fee },
    async () => {
      await zkApp.settleState(update2.proof);
    }
  );
  await tx.prove();

  console.log('send transaction...');
  const sentTx = await tx.sign([feepayerKey]).send();
  if (sentTx.status === 'pending') {
    console.log(
      '\nSuccess! Update transaction sent.\n' +
        '\nYour smart contract state will be updated' +
        '\nas soon as the transaction is included in a block:' +
        `\n${getTxnUrl(config.url, sentTx.hash)}`
    );
  }
} catch (err) {
  console.log(err);
}

function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
  const hostName = new URL(graphQlUrl).hostname;
  const txnBroadcastServiceName = hostName
    .split('.')
    .filter((item) => item === 'minascan')?.[0];
  const networkName = graphQlUrl
    .split('/')
    .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
  }
  return `Transaction hash: ${txnHash}`;
}
