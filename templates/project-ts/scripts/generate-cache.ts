import { Cache } from 'o1js';

const { Add } = await import('../build/src/Add.js');

const cache_directory = 'cache';

const cache = Cache.FileSystem(cache_directory);

const { verificationKey } = await Add.compile({ cache})