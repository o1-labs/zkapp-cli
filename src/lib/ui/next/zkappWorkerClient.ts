import * as Comlink from "comlink";

export default class ZkappWorkerClient {
   worker: Worker;

  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<typeof import('./zkappWorker').api>; 
  
constructor() {
  // Initialize the worker from the zkappWorker module
  const worker = new Worker(new URL('./zkappWorker.ts', import.meta.url), { type: 'module' });  
}  
}