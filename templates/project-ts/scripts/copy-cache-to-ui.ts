import fs from 'fs/promises';
import path from 'path';

async function copyCacheToUI() {
  try {
    // Define paths
    const cacheDir = path.join('.', 'cache');
    const uiPublicCacheDir = path.join('..', 'ui', 'public', 'cache');
    const cacheJsonSource = path.join('cache.json');
    const cacheJsonDest = path.join('..', 'ui', 'app', 'cache.json');

    // Create UI cache directory if it doesn't exist
    try {
      await fs.mkdir(uiPublicCacheDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    // Read files from cache directory
    const files = await fs.readdir(cacheDir);

    // Copy each file except README.md
    for (const file of files) {
      if (file !== 'README.md') {
        const sourceFile = path.join(cacheDir, file);
        const destFile = path.join(uiPublicCacheDir, file);

        const data = await fs.readFile(sourceFile);
        await fs.writeFile(destFile, data);
      }
    }

    // Copy cache.json to UI app directory
    try {
      const cacheJsonData = await fs.readFile(cacheJsonSource);
      await fs.writeFile(cacheJsonDest, cacheJsonData);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.log('cache.json not found, skipping');
      } else {
        throw err;
      }
    }

    console.log('Cache files copied to UI successfully');
  } catch (error) {
    console.error('Error copying cache files:', error);
    process.exit(1);
  }
}

await copyCacheToUI();
