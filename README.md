# Snapp CLI

Snapp CLI allows you to scaffold, write, test, & deploy snapps ("snark apps") for
[Mina](https://minaprotocol.com/) using recommended best practices.

To get started, please read this README, followed by [Mina's snapp
docs](https://docs.minaprotocol.com/) for a step-by-step guide.

## Dependencies

- NodeJS 16+ (or 14 using `--experimental-wasm-threads`)
- NPM 6+
- Git 2+

If you have an older version installed, we suggest installing a newer version
using the package manager for your system: [Homebrew](https://brew.sh/) (Mac),
[Chocolatey](https://chocolatey.org/) (Windows), or apt/yum/etc (Linux). On
Linux, you may need to install a recent NodeJS version via NodeSource
([deb](https://github.com/nodesource/distributions#debinstall) or
[rpm](https://github.com/nodesource/distributions#rpminstall)), as recommended
by the NodeJS Project.

## Installation

```sh
npm install -g snapp-cli
```

## Usage

```sh
snapp --help
```

### Create a new project

```sh
snapp project my-proj  # or path/to/my-proj

✔ Fetch project template
✔ Initialize Git repo
✔ NPM install
✔ Set project name
✔ Git init commit

Success!

Next steps:
  cd my-proj
  git remote add origin <your-repo-url>
  git push -u origin main
```

This command creates a directory containing a new project template, fully set up
& ready for local development.

- See the included [README](templates/project/README.md) for usage instructions.
  All usual commands will be available: `npm run build`, `npm run test`,
  `npm run coverage`, etc.
- A Git repo will be initialized in the project directory automatically. For
  consistency, we use `main` as the default Git branch, by convention.
- A [Github Actions CI workflow](templates/project/.github/workflows/ci.yml) is
  also included. If you push your project to Github, Github Actions will run
  your tests (named as `*.test.js`) automatically, whenever you push a commit or
  open a pull request.
- Code style consistency is automatically enforced via Prettier using Git
  pre-commit hooks. This requires no configuration and occurs automatically
  when you commit to Git--e.g. `git commit -m 'feat: add awesome feature'`.

### Create an example project

```sh
snapp example <name>
```

Where `name` is one of the names found in the [example directory](examples).

Examples are based on the project template & only contain changes within
the `src` directory. So feel free to use one of these as your project base.

### Create a new file

```sh
snapp file <name>  # or path/to/name
```

This will create `name.js` and `name.test.js`.

For convenience, running this command in your project's root directory will
create the files in the `src/` dir automatically. Otherwise, the files will be
created in your terminal's current working directory.

### Show system info

```sh
snapp system
```

This will output system info such as your NodeJS version, NPM version,
`snapp-cli` version, etc. Please include this if submitting a bug report for
`snapp-cli`, for easier troubleshooting.

## License

[Apache-2.0](LICENSE)
