# Snapp CLI

WIP. Not ready for use. File & project templates need to be updated when
SnarkyJS is ready.

## Installation (during development)

    git clone https://github.com/jasongitmail/snapp-cli.git
    cd snapp-cli
    npm i
    npm link

This will make the command available globally on your system.

## Usage

    snapp --help

Both `snapp` and `snap` work. Aliases are provided for both.

### Create a new project

    snap project myproj  # or path/to/myproj

    ✔ Clone project template
    ✔ NPM install
    ✔ Initialize Git repo

    Next steps:
      cd myproj
      git remote add origin <your-repo-url>
      git push -u origin main

This will create a directory containing a new project template.

- See the included [README](templates/project/README.md) for usage instructions.
  All usual commands will be available: `npm run build`, `npm run test`,
  `npm run coverage`, etc.
- A Git repo using `main` as the default branch will be initialized in the
  project dir automatically. For consistency, we use `main` as the default git
  branch, by convention.
- A [Github Actions CI workflow](templates/project/.github/workflows/ci.yml) is
  included. If you push your project to Github, you'll have continuous
  integration automatically. Github Actions will run your tests (named as
  `*.test.js`) whenever you push a commit or open a pull request.

### Create a new file

    snapp file <name>

This will create `name.js` and `name.test.js`.

### Show system info

    snapp system

This will output system info such as your NodeJS version, NPM version,
`snapp-cli` version, etc. Please include this if submitting a bug report for
`snapp-cli`, for easier troubleshooting.

## License

[Apache-2.0](LICENSE)
