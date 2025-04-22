import { Cache } from 'o1js';
import fs from 'fs-extra';

const { Add } = await import('../build/src/Add.js');
const { AddZkProgram } = await import('../build/src/AddZkProgram.js');

const cache_directory = 'cache';

const cache = Cache.FileSystem(cache_directory);

const { verificationKey } = await Add.compile({ cache});

const jsonCacheFile = cache.json;
let cacheObj = {
  files : [],
}

fs.readdirSync(cache_directory).forEach((fileName: string) => {
  if (!fileName.endsWith('.header')) {
    cacheObj['files'].push(fileName);
  }
});

try {
  fs.writeFile(
    jsonCacheFile,
    JSON.stringify(cacheObj)
  );
  console.log('JSON cached object successfully saved ');
} catch (error) {
  console.error('Error writing JSON file:', error);

}