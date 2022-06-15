const envinfo = require('envinfo');

function system() {
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
    .then((env) => env.replace('Not Found', 'Not Found (not in a project)'))
    .then((env) => console.log(env));
}

module.exports = { system };
