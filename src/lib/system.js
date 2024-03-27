import { execSync } from 'child_process';
import envinfo from 'envinfo';

function system() {
  const installedO1jsVersion = getInstalledNpmPackageVersion({
    packageName: 'o1js',
  });
  const installedZkAppCliVersion = getInstalledNpmPackageVersion({
    packageName: 'zkapp-cli',
    isGlobal: true,
  });
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
    .then((env) => {
      const str = 'zkapp-cli: Not Found';
      return env.replace(
        str,
        `zkapp-cli: ${installedZkAppCliVersion || 'Not Found'}`
      );
    })
    .then((env) => console.log(env));
}

function getInstalledNpmPackageVersion(
  options = { packageName: null, isGlobal: false }
) {
  const { packageName, isGlobal } = options;
  const maybeGlobalArg = isGlobal ? '-g' : '';
  const installedPkgs = execSync(
    `npm list ${maybeGlobalArg} --all --depth 0 --json`,
    {
      encoding: 'utf-8',
    }
  );

  return JSON.parse(installedPkgs).dependencies?.[packageName]?.version;
}

export default system;
