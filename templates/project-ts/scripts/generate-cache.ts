import { Cache } from 'o1js';
import fs from 'fs-extra';

const { Add } = await import('../build/src/Add.js');

const cache_directory = 'cache';

const cache = Cache.FileSystem(cache_directory);

const { verificationKey } = await Add.compile({ cache});

let cacheObj = {
  files : [],
}

