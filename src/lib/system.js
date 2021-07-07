const envinfo = require('envinfo');

module.exports = function () {
  console.log('Please include the following when submitting a Github issue:');
  envinfo
    .run(
      {
        System: ['OS', 'CPU'],
        Binaries: ['Node', 'npm', 'Yarn'],
        npmPackages: ['snapp-cli', 'snarky-js'],
      },
      { showNotFound: true }
    )
    .then((env) => console.log(env));
};
