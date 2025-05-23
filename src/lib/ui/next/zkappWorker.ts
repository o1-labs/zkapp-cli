import { Mina, PublicKey, fetchAccount } from 'o1js';
import * as Comlink from "comlink";
import { Add, AddZkProgram } from "../../contracts";


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
  
},
async getContractState() {
  const currentNum = await Add.current.num.get();
},

  
}

// Expose the API to be used by the main thread
Comlink.expose(api);