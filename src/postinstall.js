/**
 * postinstall.js
 */

const fs = require('fs');
const path = require('path');
const sh = require('shelljs');
const util = require('util');
const gittar = require('gittar');

const shExec = util.promisify(sh.exec);

(async () => {
  await warmNpmCache();
  await warmGittarCache();
})();

/**
 * Warm NPM cache for the dependencies used by our project templates so that
 * `npm i` or `npm ci` can work offline when called by `zk project <name>`,
 * if user has no internet when they run the project command for the first time.
 */
async function warmNpmCache() {
  console.log('  Warm NPM cache for project template deps.');
  // cwd is the root dir where zkapp-cli's package.json is located.
  const tsProj = fs.readFileSync(
    path.join('templates', 'project-ts', 'package.json'),
    'utf8'
  );

  const tsProjDeps = {
    ...JSON.parse(tsProj).dependencies,
    ...JSON.parse(tsProj).devDependencies,
  };

  const allUniqueDeps = { ...tsProjDeps };

  const toCache = [];
  for (const pkgName in allUniqueDeps) {
    toCache.push(`${pkgName}@${allUniqueDeps[pkgName]}`);
  }

  try {
    const addPkgMaxTimeLimit = 2000;
    for await (const pkgWithVersion of toCache) {
      console.log(`  Adding ${pkgWithVersion} to the cache.`);
      // Skips "Warm NPM cache for project template deps" steps  if adding
      // a pacakage takes longer than the add package max time limit.
      const npmCacheResponse = await executeInTimeLimit(
        shExec(`npm cache add ${pkgWithVersion}`),
        addPkgMaxTimeLimit
      );

      if (npmCacheResponse === null) {
        console.log('  Skip warm NPM cache for project template');
        return;
      }
    }
    console.log('    Done.');
  } catch (err) {
    console.error(err);
  }
}

async function warmGittarCache() {
  console.log('  Warm cache for project template.');

  try {
    const fetchMaxTimeLimit = 15000;
    const src = 'github:o1-labs/zkapp-cli#main';
    console.log('  Fetching project template.');
    // Skips "Warm cache for project template" step if operation takes
    // longer than the fetch max time limit.
    const response = await executeInTimeLimit(
      gittar.fetch(src, { force: true }),
      fetchMaxTimeLimit
    );

    if (response === null) {
      console.log('  Skip warm cache for project template');
      return;
    }
  } catch (err) {
    console.error(err);
  }
}

async function executeInTimeLimit(operation, maxTimeLimit) {
  let timeout;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      resolve(null);
    }, maxTimeLimit);
  });

  const response = await Promise.race([operation, timeoutPromise]);

  if (timeout) clearTimeout(timeout);

  return response;
}
