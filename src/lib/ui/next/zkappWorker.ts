import { Mina, PublicKey, fetchAccount, Field } from 'o1js';
import * as Comlink from "comlink";
import type { Add } from "../../contracts/src/Add";
import type { AddZkProgram } from "../../contracts/src/AddZkProgram";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  AddInstance: null as null | typeof Add,
  zkappInstance: null as null | Add,
  AddZkProgramInstance: null as null | typeof AddZkProgram,
  transaction: null as null | Transaction
};

export const api = {

async setActiveInstanceToDevnet() {
  Mina.setActiveInstance(Mina.Network('https://api.minascan.io/node/devnet/v1/graphql'));
},  

async compile() {
  await AddZkProgram.compile();
  await Add.compile();

},

async fetchAccount(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  return fetchAccount({ publicKey });
},
async initContractInstance(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  const contractInstance = new Add(publicKey);
},
async getContractState() {
  const currentNum = await Add.current.num.get();
},

async getZkProgramState() {
  const zkProgramState = await AddZkProgram.current.num.get();
},

async createUpdateTransaction() {

},
async proveTransaction() {

},
async getTransactionJSON() {
  ``
},
}

// Expose the API to be used by the main thread
Comlink.expose(api);