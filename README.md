# Snapp CLI

WIP. Not ready for use. File & project templates need to be updated when SnarkyJS is ready.

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
snapp project <myproj> # or path/to/myproj
cd myproj
npm install

git init \
  && git branch -m main \
  && git add . \
  && git commit -m 'Init commit'

git remote add origin <your-repo-url>
git push -u origin main
```

This will create a directory containing a new project template.

For consistency, we suggest using `main` as the default branch, by convention.

The project template comes with a Github Actions CI workflow that will run your tests (named as `*.test.js`) whenever you push a commit or open a pull request on your project when hosted on Github.
