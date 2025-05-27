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
    const Network = Mina.Network(
      "https://api.minascan.io/node/devnet/v1/graphql"
    );
    console.log("Devnet network instance configured");
    Mina.setActiveInstance(Network);
  },

  async loadContract() {
    const { Add } = await import("../../contracts/build/src/Add.js");
    const { AddZkProgram } = await import(
      "../../contracts/build/src/AddZkProgram.js"
    );
    state.AddInstance = Add;
    state.AddZkProgramInstance = AddZkProgram;
  },

  async compileZkProgram() {
    await state.AddZkProgramInstance!.compile();
  },
  async compileContract(test: any) {
    const cache = JSON.parse(test);
    await state.AddInstance!.compile({ cache });
  },

async fetchAccount(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  return fetchAccount({ publicKey });
},

async initZkappInstance(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  state.zkappInstance = new state.AddInstance!(publicKey);
},

async getNum() {
  const num = await state.zkappInstance!.num.get();
  return JSON.stringify(num.toJSON());
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