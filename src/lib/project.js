import chalk from 'chalk';
import { spawnSync } from 'child_process';
import enquirer from 'enquirer';
import fs from 'fs-extra';
import gittar from 'gittar';
import ora from 'ora';
import path from 'path';
import shell from 'shelljs';
import url from 'url';
import util from 'util';
import customNextIndex from '../lib/ui/next/customNextIndex.js';
import customNuxtIndex from '../lib/ui/nuxt/customNuxtIndex.js';
import nuxtGradientBackground from '../lib/ui/nuxt/nuxtGradientBackground.js';
import customLayoutSvelte from '../lib/ui/svelte/customLayoutSvelte.js';
import customPageSvelte from '../lib/ui/svelte/customPageSvelte.js';
import Constants from './constants.js';
import gradientBackground from './ui/svelte/gradientBackground.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const shellExec = util.promisify(shell.exec);
const isWindows = process.platform === 'win32';

/**
 * Create a new zkApp project with recommended dir structure, Prettier config,
 * testing lib, etc. Warns if already exists and does NOT overwrite.
 * @param {object} argv - The arguments object provided by yargs.
 * @param {string} argv.name - The user's specified project name.
 * @param {string} argv.ui - The name of the UI framework to use.
 * @return {Promise<void>}
 */
export async function project({ name, ui }) {
  if (fs.existsSync(name)) {
    console.error(chalk.red(`Directory already exists. Not proceeding`));
    return;
  }

  if (!shell.which('git')) {
    console.error(chalk.red('Please ensure Git is installed, then try again.'));
    return;
  }

  let res;
  if (!ui) {
    try {
      res = await enquirer.prompt({
        type: 'select',
        name: 'ui',
        choices: Constants.uiTypes,
        message: (state) =>
          message(state, 'Create an accompanying UI project too?'),
        prefix: (state) => prefix(state),
      });
    } catch (err) {
      // If ctrl+c is pressed it will throw.
      return;
    }

    ui = res.ui;
  }

  shell.mkdir('-p', name); // Create path/to/dir with their specified name
  shell.cd(name); // Set dir for shell commands. Doesn't change user's dir in their CLI.

  // If user wants a UI framework installed alongside their smart contract,
  // we'll create this dir structure:
  //   /<name>     (with .git)
  //     ui/
  //     contracts/
  // - We use NPM for the UI projects for consistency with our smart contract
  //   project, as opposed to Yarn or PNPM.
  // - spawnSync with stdio:inherit allows the child process to be interactive.
  if (ui) {
    switch (ui) {
      case 'svelte':
        scaffoldSvelte();
        break;
      case 'next':
        await scaffoldNext(name);
        break;
      case 'nuxt':
        scaffoldNuxt();
        break;
      case 'empty':
        shell.mkdir('ui');
        break;
      case 'none':
        // `zk project <name>` now shows a dropdown to allow users to select
        // from available UI project options. Because of this, we also need
        // `--ui none` in order to allow devs to create a project w/o a UI.
        ui = false;
        break;
    }

    ora(chalk.green(`UI: Set up project`)).succeed();

    if (ui && ui !== 'empty') {
      // Add o1js as a dependency in the UI project.
      let pkgJson = fs.readJsonSync(path.join('ui', 'package.json'));
      // Add dependencies object if none is found in the package.json because generated
      // SvelteKit projects do not have dependencies included.
      if (!pkgJson.dependencies) pkgJson['dependencies'] = {};
      pkgJson.dependencies.o1js = '0.*';
      fs.writeJSONSync(path.join('ui', 'package.json'), pkgJson, { spaces: 2 });

      // Use `install`, not `ci`, b/c these won't have package-lock.json yet.
      shell.cd('ui');
      await step(
        'UI: NPM install',
        `npm install --silent > ${isWindows ? 'NUL' : '"/dev/null" 2>&1'}`
      );
      shell.cd('..');
    }
  }

  // Initialize .git in the root, whether monorepo or not.
  await step('Initialize Git repo', 'git init -q');

  // Scaffold smart contract project
  if (ui) {
    shell.mkdir('contracts');
    shell.cd('contracts');
  }
  if (!(await fetchProjectTemplate())) return;

  await step(
    'NPM install',
    `npm install --silent > ${isWindows ? 'NUL' : '"/dev/null" 2>&1'}`
  );

  // Build the template contract so it can be imported into the ui scaffold
  await step('NPM build contract', 'npm run build --silent');

  await setProjectName('.', name.split(path.sep).pop());

  if (ui) shell.cd('..'); // back to project root

  await step(
    'Git init commit',
    'git add . && git commit -m "Init commit" -q -n && git branch -m main'
  );

  const str =
    `\nSuccess!\n` +
    `\nNext steps:` +
    `\n  cd ${name}` +
    `\n  git remote add origin <your-repo-url>` +
    `\n  git push -u origin main`;

  console.log(chalk.green(str));
  process.exit(0);
}

/**
 * Fetch project template.
 * @returns {Promise<boolean>} - True if successful; false if not.
 */
async function fetchProjectTemplate() {
  const projectName = 'project-ts';

  const step = 'Set up project';
  const spin = ora({ text: `${step}...`, discardStdin: true }).start();

  try {
    const src = 'github:o1-labs/zkapp-cli#main';
    await gittar.fetch(src, { force: true });

    // Note: Extract will overwrite any existing dir's contents. Ensure
    // destination does not exist before this.
    const TEMP = '.gittar-temp-dir';
    await gittar.extract(src, TEMP, {
      filter(path) {
        return path.includes(`templates/${projectName}/`);
      },
    });

    // Copy files into current working dir
    shell.cp(
      '-r',
      `${path.join(TEMP, 'templates', projectName)}${path.sep}.`,
      '.'
    );
    shell.rm('-r', TEMP);

    // Create a keys dir because it's not part of the project scaffolding given
    // we have `keys` in our .gitignore.
    shell.mkdir('keys');

    spin.succeed(chalk.green(step));
    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  }
}

/**
 * Helper for any steps that need to call a shell command.
 * @param {string} step - Name of step to show user
 * @param {string} cmd - Shell command to execute.
 * @returns {Promise<void>}
 */
export async function step(step, cmd) {
  const spin = ora({ text: `${step}...`, discardStdin: true }).start();
  try {
    await shellExec(cmd);
    spin.succeed(chalk.green(step));
  } catch (err) {
    spin.fail(step);
    process.exit(1);
  }
}

/**
 * Step to replace placeholder names in the project with the properly-formatted
 * version of the user-supplied name as specified via `zk project <name>`
 * @param {string} dir - Path to the dir containing target files to be changed.
 * @param {string} name - User-provided project name.
 * @returns {Promise<void>}
 */
export async function setProjectName(dir, name) {
  const step = 'Set project name';
  const spin = ora(`${step}...`).start();

  replaceInFile(path.join(dir, 'README.md'), 'PROJECT_NAME', titleCase(name));
  replaceInFile(
    path.join(dir, 'package.json'),
    'package-name',
    kebabCase(name)
  );

  spin.succeed(chalk.green(step));
}

/**
 * Helper to replace text in a file.
 * @param {string} file - Path to file
 * @param {string} a - Old text.
 * @param {string} b - New text.
 */
export function replaceInFile(file, a, b) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(a, b);
  fs.writeFileSync(file, content);
}

export function titleCase(str) {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
    .join(' ');
}

export function kebabCase(str) {
  return str.toLowerCase().replace(' ', '-');
}

function scaffoldSvelte() {
  // `-y` installs the latest version of create-svelte without prompting.
  spawnSync('npm', ['create', 'svelte@latest', '-y', 'ui'], {
    stdio: 'inherit',
    shell: true,
  });

  shell.cp(
    path.join(__dirname, 'ui', 'svelte', 'hooks.server.js'),
    path.join('ui', 'src')
  );

  const customTsConfig = ` {
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "target": "es2020",
    "module": "es2022",
    "lib": ["dom", "esnext"],
    "strict": true,
    "strictPropertyInitialization": false, // to enable generic constructors, e.g. on CircuitValue
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowJs": true,
    "declaration": true,
    "sourceMap": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true
  },
  // Path aliases are handled by https://kit.svelte.dev/docs/configuration#alias
	//
	// If you want to overwrite includes/excludes, make sure to copy over the relevant includes/excludes
	// from the referenced tsconfig.json - TypeScript does not merge them in
}
  `;
  let useTypescript = true;
  try {
    // Determine if generated project is a ts project by looking for a tsconfig file
    fs.readFileSync(path.join('ui', 'tsconfig.json'));
    fs.writeFileSync(path.join('ui', 'tsconfig.json'), customTsConfig);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
    }
    useTypescript = false;
  }

  const viteConfigFileName = useTypescript
    ? 'vite.config.ts'
    : 'vite.config.js';

  const vitConfig = fs.readFileSync(
    path.join('ui', viteConfigFileName),
    'utf8'
  );

  const customViteConfig = vitConfig.replace(
    /^}(.*?)$/gm, // Search for the last '}' in the file.
    `,
    build: {
      target: 'esnext'
    },
    optimizeDeps: { esbuildOptions: { target: 'esnext' } }
  });`
  );

  fs.writeFileSync(path.join('ui', viteConfigFileName), customViteConfig);

  // Remove Sveltekit demo pages and components if found
  fs.emptyDirSync(path.join('ui', 'src', 'routes'));

  fs.writeFileSync(
    path.join('ui', 'src', 'routes', '+page.svelte'),
    customPageSvelte
  );

  fs.writeFileSync(
    path.join('ui', 'src', 'routes', '+layout.svelte'),
    customLayoutSvelte
  );

  fs.writeFileSync(
    path.join('ui', 'src', 'routes', 'GradientBG.svelte'),
    gradientBackground
  );

  fs.mkdirsSync(path.join('ui', 'src', 'styles'));

  // Adds landing page styles directory and files to SvelteKit project.
  fs.copySync(
    path.join(__dirname, 'ui', 'svelte', 'styles'),
    path.join('ui', 'src', 'styles')
  );

  // Remove Sveltkit demo lib and assets if found
  fs.emptyDirSync(path.join('ui', 'src', 'lib'));

  // Adds landing page lib directory and files to SvelteKit project.
  fs.copySync(
    path.join(__dirname, 'ui', 'svelte', 'lib'),
    path.join('ui', 'src', 'lib')
  );

  // Removes Sveltekit static assets
  fs.emptyDirSync(path.join('ui', 'static'));

  fs.copySync(
    path.join(__dirname, 'ui', 'svelte', 'favicon.png'),
    path.join('ui', 'static', 'favicon.png')
  );
}

async function scaffoldNext(projectName) {
  const ghPagesPrompt = new enquirer.Select({
    message: (state) =>
      message(
        state,
        'Do you want to set up your project for deployment to GitHub Pages?'
      ),
    choices: ['no', 'yes'],
    prefix: (state) => prefix(state),
  });

  let useGHPages;
  try {
    useGHPages = (await ghPagesPrompt.run()) == 'yes';
  } catch (err) {
    // If ctrl+c is pressed it will throw.
    return;
  }

  // set the project name and default flags
  // https://nextjs.org/docs/api-reference/create-next-app#options
  let args = [
    'create-next-app@13.4.1',
    'ui',
    '--use-npm',
    '--src-dir',
    '--import-alias "@/*"',
    '--no-app',
  ];

  spawnSync('npx', args, {
    stdio: 'inherit',
    shell: true,
  });

  shell.rm('-rf', path.join('ui', '.git')); // Remove NextJS' .git; we will init .git in our monorepo's root.
  // Read in the NextJS config file and add the middleware.

  let useTypescript = true;
  try {
    // Determine if generated project is a ts project by looking for a tsconfig file
    fs.readFileSync(path.join('ui', 'tsconfig.json'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
    }
    useTypescript = false;
  }

  const nextConfig = fs.readFileSync(path.join('ui', 'next.config.js'), 'utf8');

  let newNextConfig = nextConfig.replace(
    /^}(.*?)$/gm, // Search for the last '}' in the file.
    `

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      o1js: require('path').resolve('node_modules/o1js')
    };
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
  // To enable o1js for the web, we must set the COOP and COEP headers.
  // See here for more information: https://docs.minaprotocol.com/zkapps/how-to-write-a-zkapp-ui#enabling-coop-and-coep-headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  }
};`
  );

  // This prevents usEffect from running twice on initial mount.
  newNextConfig = newNextConfig.replace(
    'reactStrictMode: true',
    'reactStrictMode: false'
  );

  fs.writeFileSync(path.join('ui', 'next.config.js'), newNextConfig);

  const indexFileName = useTypescript ? 'index.tsx' : 'index.js';

  fs.writeFileSync(
    path.join('ui', 'src/pages', indexFileName),
    customNextIndex,
    'utf8'
  );

  // Adds landing page components directory and files to NextJS project.
  fs.copySync(
    path.join(__dirname, 'ui', 'next', 'components'),
    path.join('ui', 'src', 'components')
  );

  // Adds landing page style directory and files to NextJS project.
  fs.copySync(
    path.join(__dirname, 'ui', 'next', 'styles'),
    path.join('ui', 'src', 'styles')
  );

  // Removes create-next-app assets
  fs.emptyDirSync(path.join('ui', 'public'));

  // Adds landing page assets directory and files to NextJS project.
  fs.copySync(
    path.join(__dirname, 'ui', 'next', 'assets'),
    path.join('ui', 'public', 'assets')
  );

  const tsconfig = `
    {
    "compilerOptions": {
        "target": "es2020",
        "module": "esnext",
        "lib": ["dom", "dom.iterable","esnext"],
        "strict": true,
        "strictPropertyInitialization": false, // to enable generic constructors, e.g. on CircuitValue
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "esModuleInterop": true,
        "moduleResolution": "node",
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "allowJs": true,
        "declaration": true,
        "sourceMap": true,
        "noFallthroughCasesInSwitch": true,
        "allowSyntheticDefaultImports": true,
        "isolatedModules": true,
        "noEmit": true,
        "incremental": true,
        "resolveJsonModule": true,
        "jsx": "preserve",
        "paths": {
          "@/*": ["./src/*"]
    }
      },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
    "exclude": ["node_modules"]
    }
  `;

  if (useTypescript) {
    fs.writeFileSync(path.join('ui', 'tsconfig.json'), tsconfig);

    // Add a script to the package.json
    let x = fs.readJsonSync(path.join('ui', 'package.json'));
    x.scripts['ts-watch'] = 'tsc --noEmit --incremental --watch';
    fs.writeJSONSync(path.join('ui', 'package.json'), x, { spaces: 2 });
  }

  if (useGHPages) {
    const nextConfig = fs.readFileSync(
      path.join('ui', 'next.config.js'),
      'utf8'
    );

    console.log(
      'Using project name ' +
        projectName +
        ' for GitHub repo name. Change in next.config.js and pages/reactCOIServiceWorker.tsx if this is not correct or changes'
    );

    let newNextConfig = nextConfig.replace(
      '  }\n};',
      `  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  /* Used to serve the Next.js app from a subdirectory (the GitHub repo name) and 
   * assetPrefix is used to serve assets (JS, CSS, images, etc.) from that subdirectory 
   * when deployed to GitHub Pages. The assetPrefix needs to be added manually to any assets
   * if they're not loaded by Next.js' automatic handling (for example, in CSS files or in a <img> element). 
   * The 'ghp-postbuild.js' script in this project prepends the repo name to asset urls in the built css files 
   * after runing 'npm run deploy'.
   */
  basePath: process.env.NODE_ENV === 'production' ? '/${projectName}' : '', // update if your repo name changes for 'npm run deploy' to work successfully
  assetPrefix: process.env.NODE_ENV === 'production' ? '/${projectName}/' : '', // update if your repo name changes for 'npm run deploy' to work successfully
};`
    );

    newNextConfig = newNextConfig.replace(
      'return config;',
      `config.optimization.minimizer = [];
    return config;`
    );

    // update papage extensions
    newNextConfig = newNextConfig.replace(
      'reactStrictMode: false,',
      `reactStrictMode: false,
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],`
    );

    fs.writeFileSync(path.join('ui', 'next.config.js'), newNextConfig);

    // Add some scripts to the package.json
    let x = fs.readJsonSync(`ui/package.json`);
    x.scripts['export'] = 'next export';
    const deployScript = `next build && next export && ${
      isWindows
        ? `type nul > ${path.join('out', '.nojekyll')}`
        : `touch ${path.join('out', '.nojekyll')}`
    } && node ./ghp-postbuild && git add -f out && git commit -m "Deploy gh-pages" && cd .. && git subtree push --prefix ui/out origin gh-pages`;
    x.scripts['deploy'] = deployScript;
    fs.writeJSONSync(path.join('ui', 'package.json'), x, { spaces: 2 });

    shell.cd('ui');
    await step(
      'COI-ServiceWorker: NPM install',
      `npm install coi-serviceworker --save > ${
        isWindows ? 'NUL' : '"/dev/null" 2>&1'
      }`
    );

    shell.cp(
      path.join(
        'node_modules',
        'coi-serviceworker',
        'coi-serviceworker.min.js'
      ),
      './public/'
    );
    shell.cd('..');

    const appFileName = useTypescript ? '_app.tsx' : '_app.js';
    const appPagesFileName = useTypescript ? '_app.page.tsx' : '_app.page.js';
    const indexFileName = useTypescript ? 'index.tsx' : 'index.js';
    const indexPagesFileName = useTypescript
      ? 'index.page.tsx'
      : 'index.page.js';
    const reactCOIServiceWorkerFileName = useTypescript
      ? 'reactCOIServiceWorker.tsx'
      : 'reactCOIServiceWorker.js';
    shell.mv(
      path.join('ui', 'src/pages', appFileName),
      path.join('ui', 'src/pages', appPagesFileName)
    );
    shell.mv(
      path.join('ui', 'src/pages', indexFileName),
      path.join('ui', 'src/pages', indexPagesFileName)
    );

    let appFile = fs.readFileSync(
      path.join('ui', 'src', 'pages', appPagesFileName),
      'utf8'
    );

    appFile = appFile.replace(
      'export default function',
      `import './reactCOIServiceWorker';

export default function`
    );
    fs.writeFileSync(
      path.join('ui', 'src', 'pages', appPagesFileName),
      appFile
    );

    fs.writeFileSync(
      path.join('ui', 'src', 'pages', reactCOIServiceWorkerFileName),
      `
export {}

function loadCOIServiceWorker() {
  if (typeof window !== 'undefined' && window.location.hostname != 'localhost') {
    const coi = window.document.createElement('script');
    coi.setAttribute('src','/${projectName}/coi-serviceworker.min.js'); // update if your repo name changes for npm run deploy to work successfully
    window.document.head.appendChild(coi);
  }
}

loadCOIServiceWorker();
`
    );

    let ghpPostBuildScript = fs.readFileSync(
      path.join(__dirname, 'ui', 'next', 'ghp-postbuild.js'),
      'utf8'
    );

    ghpPostBuildScript = ghpPostBuildScript.replace(
      `let repoURL = '';`,
      `let repoURL = "${projectName}";`
    );

    fs.writeFileSync(path.join('ui', 'ghp-postbuild.js'), ghpPostBuildScript);
  }
}

function scaffoldNuxt() {
  spawnSync('npx', ['nuxi', 'init', 'ui'], {
    stdio: 'inherit',
    shell: true,
  });

  if (fs.existsSync(path.join('ui', '.git'))) {
    shell.rm('-rf', path.join('ui', '.git')); // Remove NuxtJS' .git; we will init .git in our monorepo's root.
  }

  // Add server middleware file to setCOOP and COEP
  fs.mkdirSync(path.join('ui', 'server', 'middleware'), { recursive: true });
  fs.copySync(
    path.join(__dirname, 'ui', 'nuxt', 'headers.js'),
    path.join('ui', 'server', 'middleware', 'headers.js')
  );

  // Read in the NuxtJS config file and add the middleware, vite config, and global css styles to scaffold.
  const nuxtConfig = fs.readFileSync(path.join('ui', 'nuxt.config.ts'), 'utf8');
  let newNuxtConfig = nuxtConfig.replace(
    'export default defineNuxtConfig({',
    `
  export default defineNuxtConfig({
    
    vite: {
      build: { target: "esnext" },
      optimizeDeps: { esbuildOptions: { target: "esnext" } },
    },

    css: ['~/assets/styles/globals.css'],
  `
  );

  fs.writeFileSync(path.join('ui', 'nuxt.config.ts'), newNuxtConfig);

  const appVue = fs.readFileSync(path.join('ui', 'app.vue'), 'utf8');
  // Replace the nuxt welcome page with the index landing page at the root of the nuxt project
  const newAppVue = appVue.replace('Welcome', 'Page');
  fs.writeFileSync(path.join('ui', 'app.vue'), newAppVue);

  fs.mkdirSync(path.join('ui', 'pages'));

  fs.writeFileSync(path.join('ui', 'pages', 'index.vue'), customNuxtIndex);

  fs.mkdirsSync(path.join('ui', 'components'));

  fs.writeFileSync(
    path.join('ui', 'components', 'GradientBG.vue'),
    nuxtGradientBackground
  );

  // Adds landing page assets directory and files to Nuxt project.
  fs.copySync(
    path.join(__dirname, 'ui', 'nuxt', 'assets'),
    path.join('ui', 'assets')
  );
  // Removes nuxt static assets
  fs.emptyDirSync(path.join('ui', 'public'));

  fs.copySync(
    path.join(__dirname, 'ui', 'nuxt', 'favicon.ico'),
    path.join('ui', 'public', 'favicon.ico')
  );
}

/**
 * Custom message method for Enquirer, to use our desired colors.
 * Make the step text green upon success, else use the reset color.
 * @param {object} state - Enquirer's state object.
 * @param {string} str - Prompt message to show.
 * @returns {string}
 */
function message(state, str) {
  const style =
    state.submitted && !state.cancelled ? state.styles.success : chalk.reset;
  return style(str);
}

/**
 * Custom prefix method for Enquirer.
 *  1. Show a cyan question mark when not submitted.
 *  2. Show a green check mark if submitted.
 *  3. Show a red "x" if ctrl+C is pressed (default is a magenta).
 * @param {object} state - Enquirer's state object.
 * @returns {string} The prefix symbol to use.
 */
function prefix(state) {
  if (!state.submitted) return state.symbols.question;
  return !state.cancelled
    ? state.symbols.check
    : chalk.red(state.symbols.cross);
}
