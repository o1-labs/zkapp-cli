# Snapp CLI

WIP. Not ready for use. File & project templates need to be updated when
SnarkyJS is ready.

## Installation (during development)

```sh
git clone https://github.com/jasongitmail/snapp-cli.git
cd snapp-cli
npm i
npm link
```

This will make the command available globally on your system.

## Usage

```sh
snapp --help
```

Both `snapp` and `snap` work. Aliases are provided for both.

### Create a new project

```sh
snapp project my-proj  # or path/to/my-proj

✔ Clone project template
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

### Create a new file

```sh
snapp file <name>
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
