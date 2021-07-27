/**
 * postinstall.js
 */

const fs = require('fs');
const sh = require('shelljs');
const util = require('util');
const degit = require('degit');
const gittar = require('gittar');

const shExec = util.promisify(sh.exec);

(async () => {
  await warmNpmCache();
  await warmDegitCache();
  await warmGittarCache();
})();

/**
 * Warm NPM cache for the dependencies used by our project templates so that
 * `npm i` or `npm ci` can work offline when called by `snapp project <name>`,
 * if user has no internet when they run the project command for the first time.
 */
async function warmNpmCache() {
  console.log('  Warm NPM cache for project template deps.');

  // cwd is the root dir where snapp-cli's package.json is located.
  const jsProj = fs.readFileSync('templates/project/package.json', 'utf8');
  const tsProj = fs.readFileSync('templates/project-ts/package.json', 'utf8');

  let jsProjDeps = {
    ...JSON.parse(jsProj).dependencies,
    ...JSON.parse(jsProj).devDependencies,
  };

  let tsProjDeps = {
    ...JSON.parse(tsProj).dependencies,
    ...JSON.parse(tsProj).devDependencies,
  };

  for (prop in tsProjDeps) {
    if (jsProjDeps[prop] && jsProjDeps[prop] === tsProjDeps[prop]) {
      delete tsProjDeps[prop];
    }
  }

  const allUniqueDeps = { ...jsProjDeps, ...tsProjDeps };

  let toCache = [];
  for (const pkgName in allUniqueDeps) {
    toCache.push(`${pkgName}@${allUniqueDeps[pkgName]}`);
  }

  try {
    await shExec(`npm cache add ${toCache.join(' ')}`);
    console.log('    Done.');
  } catch (err) {
    console.error(err);
  }
}

// /**
//  * Warm degit to be used offline for *any* project templates, stored anywhere
//  * within the target repo.
//  */
// async function warmDegitCache() {
//   console.log('  Warm degit cache for project template.');

//   const emitter = degit('github:o1-labs/snapp-cli#main', {
//     cache: false, // Do not read from cache, but will warm the cache.
//     force: true,
//   });

//   try {
//     const TEMP_DIR = `.degit-tmp-cache-warmer`;
//     await emitter.clone(TEMP_DIR);
//     console.log('    Done.');
//     await shExec(`rm -rf ${TEMP_DIR}`);
//   } catch (err) {
//     console.error(err);
//   }
// }

async function warmGittarCache() {
  console.log('  Warm cache for project template.');

  try {
    const src = 'github:o1-labs/snapp-cli#main';
    await gittar.fetch(src);
  } catch (err) {
    console.error(err);
  }
}
