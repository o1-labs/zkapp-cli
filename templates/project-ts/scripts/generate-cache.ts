import { Cache } from 'o1js';
import fs from 'fs-extra';

const { Add } = await import('../build/src/Add.js');

const cache_directory = 'cache';

const cache = Cache.FileSystem(cache_directory);

const { verificationKey } = await Add.compile({ cache});

const jsonCacheFile = cache.json;
let cacheObj = {
  files : [],
}

fs.readdirSync(cache_directory).forEach((file_name: string) => {
  if (!file_name.endsWith('.header')) {
    cacheObj['files'].push(file_name);
  }
});

fs.writeFile(
  jsonCacheFile,
  JSON.stringify(cacheObj)
);