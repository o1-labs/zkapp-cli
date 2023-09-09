import { execSync } from 'child_process';
import envinfo from 'envinfo';

function system() {
  const installedO1jsVersion = getInstalledO1jsVersion();
  console.log(
    'Be sure to include the following system information when submitting a GitHub issue:'
  );
  envinfo
    .run(
      {
        System: ['OS', 'CPU'],
        Binaries: ['Node', 'npm', 'Yarn'],
        npmPackages: ['o1js'],
        npmGlobalPackages: ['zkapp-cli'],
      },
      { showNotFound: true }
    )
    .then((env) => {
      const str = 'o1js: Not Found';
      return env.replace(
        str,
        `o1js: ${installedO1jsVersion || 'Not Found (not in a project)'}`
      );
    })
    .then((env) => console.log(env));
}

function getInstalledO1jsVersion() {
  const installedPkgs = execSync('npm list --all --depth 0 --json', {
    encoding: 'utf-8',
  });

  return JSON.parse(installedPkgs)['dependencies']?.['o1js']?.['version'];
}

export default system;
