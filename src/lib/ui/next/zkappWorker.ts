import { Mina, PublicKey, fetchAccount } from 'o1js';
import * as Comlink from "comlink";
import { ZkappWorkerAPI } from './zkappWorkerAPI';
import { Add, AddZkProgram } from "../../contracts";


export const api = {

async compile() {
  await AddZkProgram.compile();
  await Add.compile();

},

  async getContractState() {
    const currentNum = await Add.current.num.get();
  },
  
}

// Expose the API to be used by the main thread
Comlink.expose(api);