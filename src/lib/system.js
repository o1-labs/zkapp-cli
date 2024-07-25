import envinfo from 'envinfo';
import { execSync } from 'node:child_process';

// Module external API
export default system;

// Module internal API (exported for testing purposes)
export { getInstalledNpmPackageVersion };

async function system() {
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
  let env = await envinfo.run(
    {
      System: ['OS', 'CPU'],
      Binaries: ['Node', 'npm', 'Yarn'],
      npmPackages: ['o1js'],
      npmGlobalPackages: ['zkapp-cli'],
    },
    { showNotFound: true }
  );
  env = env.replace(
    'o1js: Not Found',
    `o1js: ${installedO1jsVersion || 'Not Found (not in a project)'}`
  );
  env = env.replace(
    'zkapp-cli: Not Found',
    `zkapp-cli: ${installedZkAppCliVersion || 'Not Found'}`
  );
  console.log(env);
}

function getInstalledNpmPackageVersion(
  options = { packageName: null, isGlobal: false }
) {
  const { packageName, isGlobal } = options;
  const maybeGlobalArg = isGlobal ? '-g' : '';
  try {
    const installedPkgs = execSync(
      `npm list ${maybeGlobalArg} --all --depth 0 --json`,
      {
        encoding: 'utf-8',
      }
    );
    const parsedPkgs = JSON.parse(installedPkgs);
    return parsedPkgs.dependencies?.[packageName]?.version;
  } catch (error) {
    return undefined;
  }
}
