const envinfo = require('envinfo');
const sh = require('child_process').execSync;

function system() {
  const installedPkgs = sh('npm list --all --depth 0 --json', {
    encoding: 'utf-8',
  });

  console.log('Please include the following when submitting a Github issue:');
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
      return env.replace(str, `${str} (not in a project)`);
    })
    .then((env) => console.log(env));
}

module.exports = { system };
