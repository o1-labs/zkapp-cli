import { Field } from "o1js";
import * as Comlink from "comlink";

export default class ZkappWorkerClient {
   worker: Worker;

  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<typeof import('./zkappWorker').api>; 
  
constructor() {
  // Initialize the worker from the zkappWorker module
  const worker = new Worker(new URL('./zkappWorker.ts', import.meta.url), { type: 'module' });  
  // Wrap the worker with Comlink to enable direct method invocation
  this.remoteApi = Comlink.wrap(worker);
}  

async setActiveInstanceToDevnet() {
  return this.remoteApi.setActiveInstanceToDevnet();
}
async loadContract() {
  return this.remoteApi.loadContract();
}

async compileZkProgram() {
  return this.remoteApi.compileZkProgram();
}

async compileContract(test: any) {
  return this.remoteApi.compileContract(test);
}

async fetchAccount(publicKeyBase58: string) {
  return this.remoteApi.fetchAccount(publicKeyBase58);
}

async initZkappInstance(publicKeyBase58: string) {
  return this.remoteApi.initZkappInstance(publicKeyBase58);
}

async updateZkProgram(contractState: string, proof: any) {
  return this.remoteApi.updateZkProgram(contractState, proof);
}

async getNum(): Promise<Field> {
  const result = await this.remoteApi.getNum();
  return Field.fromJSON(JSON.parse(result as string));
}

async initZkProgram(num: string) {
  return this.remoteApi.initZkProgram(num);
}

async createSettleStateTransaction(proof: any) {
  return this.remoteApi.createSettleStateTransaction(proof);
}

async proveSettleStateTransaction() {
  return this.remoteApi.proveSettleStateTransaction();
}

}