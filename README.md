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

    snapp project <myproj> # or path/to/myproj
    cd myproj
    npm install

    git init \
      && git branch -m main \
      && git add . \
      && git commit -m 'Init commit'

    git remote add origin <your-repo-url>
    git push -u origin main

This will create a directory containing a new project template.

For consistency, we suggest using `main` as the default branch, by convention.

The project template comes with a Github Actions CI workflow that will run your
tests (named as `*.test.js`) whenever you push a commit or open a pull request,
if hosting your repo on Github.

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
