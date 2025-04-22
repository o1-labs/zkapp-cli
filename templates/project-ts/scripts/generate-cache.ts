import { Cache } from 'o1js';
import fs from 'fs/promises';

const { Add } = await import('../build/src/Add.js');
const { AddZkProgram } = await import('../build/src/AddZkProgram.js');

const cache_directory = 'cache';

const cache: Cache = Cache.FileSystem(cache_directory);

await AddZkProgram.compile({ cache });
await Add.compile({ cache});

type CacheList = {
  files: string[];
};
let cacheObj: CacheList = {
  files : [],
}

const files = await fs.readdir(cache_directory);
for (const fileName of files) {
  if (!fileName.endsWith('.header')) {
    cacheObj['files'].push(fileName);
  }
}


const jsonCacheFile = cache.json;

try {
  await fs.writeFile(
    jsonCacheFile,
    JSON.stringify(cacheObj, null, 2)
  );
  console.log('JSON cached object successfully saved ');
} catch (error) {
  console.error('Error writing JSON file:', error);

}