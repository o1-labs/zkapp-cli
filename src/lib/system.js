const envinfo = require('envinfo');
const sh = require('child_process').execSync;

function system() {
  const installedSnarkyJSversion = getInstalledSnarkyJSversion();
  console.log(
    'Be sure to include the following system information when submitting a GitHub issue:'
  );
  envinfo
    .run(
      {
        System: ['OS', 'CPU'],
        Binaries: ['Node', 'npm', 'Yarn'],
        npmPackages: ['snarkyjs'],
        npmGlobalPackages: ['zkapp-cli'],
      },
      { showNotFound: true }
    )
    .then((env) => {
      const str = 'snarkyjs: Not Found';
      return env.replace(
        str,
        `snarkyjs: ${
          installedSnarkyJSversion
            ? installedSnarkyJSversion
            : 'Not Found (not in a project)'
        }`
      );
    })
    .then((env) => console.log(env));
}

function getInstalledSnarkyJSversion() {
  const installedPkgs = sh('npm list --all --depth 0 --json', {
    encoding: 'utf-8',
  });

  return JSON.parse(installedPkgs)['dependencies']?.['snarkyjs']?.['version'];
}

module.exports = { system };
