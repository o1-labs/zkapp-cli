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

    console.log('Cache files copied to UI successfully');
  } catch (error) {
    console.error('Error copying cache files:', error);
    process.exit(1);
  }
}

// Using top-level await (requires Node.js v14.8.0 or later)
await copyCacheToUI();
