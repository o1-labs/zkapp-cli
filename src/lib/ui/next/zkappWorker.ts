import { Mina, PublicKey, fetchAccount } from 'o1js';
import * as Comlink from "comlink";

export const api = {}

// Expose the API to be used by the main thread
Comlink.expose(api);