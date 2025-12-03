export default `import { Mina, PublicKey, fetchAccount, Field, JsonProof, Cache } from 'o1js';
import * as Comlink from "comlink";
import { AddProgramProof } from "../../contracts/src/AddZkProgram";
import type { Add } from "../../contracts/src/Add";
import type { AddZkProgram } from "../../contracts/src/AddZkProgram";
import cacheJSONList from "./cache.json";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  AddInstance: null as null | typeof Add,
  zkappInstance: null as null | Add,
  AddZkProgramInstance: null as null | typeof AddZkProgram,
  transaction: null as null | Transaction
};

const fetchFiles = async () => {
  const cacheJson = cacheJSONList;
  const cacheListPromises = cacheJson.files.map(async (file) => {
  const [header, data] = await Promise.all([
    fetch(\`/cache/\${file}.header\`).then((res) => res.text()),
    fetch(\`/cache/\${file}\`).then((res) => res.text())
    ]);
    return { file, header, data };
  });

  const cacheList = await Promise.all(cacheListPromises);

  return cacheList.reduce((acc: any, { file, header, data }) => {
    acc[file] = { file, header, data };
    return acc;
  }, {});
};

const FileSystem = (files: any): Cache => ({
  read({ persistentId, uniqueId, dataType }: any) {
    if (!files[persistentId]) {
      return undefined;
    }

    const currentId = files[persistentId].header;

    if (currentId !== uniqueId) {
      return undefined;
    }

    if (dataType === "string") {
      console.log("found in cache:", { persistentId, uniqueId, dataType });

      return new TextEncoder().encode(files[persistentId].data);
    }
    return undefined;
  },

  write({ persistentId, uniqueId, dataType }: any, data: any) {
    console.log({ persistentId, uniqueId, dataType });
  },

  canWrite: false
});

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
    const cacheFiles = await fetchFiles();
    await state.AddZkProgramInstance!.compile({ cache: FileSystem(cacheFiles) });
  },
  async compileContract() {
    const cacheFiles = await fetchFiles();
    await state.AddInstance!.compile({ cache: FileSystem(cacheFiles) });
  },

async fetchAccount(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  return fetchAccount({ publicKey });
},

async initZkappInstance(publicKey58: string) {
  const publicKey = PublicKey.fromBase58(publicKey58);
  state.zkappInstance = new state.AddInstance!(publicKey);
},

async initZkProgram(num: string) {
  const init = await state.AddZkProgramInstance!.init(Field(num));
  return init.proof.toJSON();
},

async getNum() {
  const num = await state.zkappInstance!.num.get();
  return JSON.stringify(num.toJSON());
},

async updateZkProgram(contractState: string, proof: JsonProof) {
  const previousProof = await AddProgramProof.fromJSON(proof);
  const update = await state.AddZkProgramInstance!.update(
    Field(contractState),
    previousProof
  );

  return update.proof.toJSON();
},

async createSettleStateTransaction(proof: JsonProof) {
  const zkProgramProof = await AddProgramProof.fromJSON(proof);
  state.transaction = await Mina.transaction(async () => {
    await state.zkappInstance!.settleState(zkProgramProof);
  });
},

async proveSettleStateTransaction() {
  await state.transaction!.prove();
},

async getTransactionJSON() {
  return state.transaction!.toJSON();
}
}

// Expose the API to be used by the main thread
Comlink.expose(api);`;
