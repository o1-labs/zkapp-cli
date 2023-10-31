# zkApp CLI

The zkApp CLI allows you to scaffold, write, test, and deploy zkApps (zero knowledge apps) for [Mina Protocol](https://minaprotocol.com/) using recommended best practices.

Apps are written using [o1js](https://docs.minaprotocol.com/en/zkapps/o1js-reference), a TypeScript framework for writing zero knowledge proof-based smart contracts. o1js is automatically included when you create a project using the Mina zkApp CLI.

## Getting Started

Read through this README file and the Mina Protocol [zkApp Developer](https://docs.minaprotocol.com/zkapps) docs.

Build foundational knowledge by completing the guided steps in the [zkApp Developer Tutorials](https://docs.minaprotocol.com/zkapps/tutorials).

## Get Involved

To learn about ways to participate and interact with community members, see the Mina [Online Communities](https://docs.minaprotocol.com/participate/online-communities) docs.

Contributions are always appreciated. See the zkApp CLI [CONTRIBUTING](https://github.com/o1-labs/zkapp-cli/blob/main/README.md) guidelines.

## Install the zkApp CLI

To install the zkApp CLI:

```sh
$ npm install -g zkapp-cli
```

To confirm successful installation:

```sh
$ zk --version
```

### Update the zkApp CLI

You are prompted to install the new version if you are running an earlier zkApp CLI minor version. For example, if you are running version 0.9.8, but the current version is 0.10.2, you are prompted to update.

You are not prompted to update if you are using an earlier patch version. For example, you are not notified to upgrade when you are running 0.10.1, and the current version is 0.10.2.

To update to the latest version of the Mina zkApp CLI:

```sh
$ npm update -g zkapp-cli
```

### Dependencies

To use the zkApp CLI and o1js, your environment requires:

- NodeJS v16 and later
- NPM v8 and later
- Git v2 and later

Use a package manager to install the required versions and upgrade older versions if needed. Package managers for the supported environments are:

- MacOS [Homebrew](https://brew.sh/)
- Windows [Chocolatey](https://chocolatey.org/)
- Linux

  - apt, yum, and others

  On Linux, you might need to install a recent Node.js version by using NodeSource. Use [deb](https://github.com/nodesource/distributions#debinstall) or [rpm](https://github.com/nodesource/distributions#rpminstall) as recommended by the Node.js project.

To verify your installed versions, use `npm -v`, `node -v`, and `git -v`.

## Usage

To see all of the zkApp CLI commands:

```sh
zk --help
```

### Create a project

```sh
zk project my-proj  # or path/to/my-proj

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

This command creates a directory containing a new project template, fully set up and ready for local development.

- See the included [README](templates/project-ts/README.md) for usage instructions.
  All of the usual commands are available: `npm run build`, `npm run test`, `npm run coverage`, and so on.
- A GitHub repo is automatically initialized in the project directory. For consistency and by convention, we use `main` as the default development branch.
- A [GitHub Actions CI workflow](templates/project-ts/.github/workflows/ci.yml) is
  also included. If you push your project to GitHub, GitHub Actions run your tests (named as `*.test.js`) automatically whenever you push a commit or open a pull request.
- Code style consistency (using Prettier) and linting (using ES Lint) is automatically enforced using Git pre-commit hooks. This requires no configuration and occurs automatically when you commit a change, for example, `git commit -m 'feat: add awesome feature'`.

## Create an example project

```sh
zk example <name>
```

where `name` is one of the names found in the [zkApps examples](https://github.com/o1-labs/docs2/tree/main/examples/zkapps) directory.

All examples are based on the standard project template created by the zkApp CLI and contain only changes within the `src` directory, so feel free to use one of these examples as your project base.

When inside an example folder in your terminal, you can run the example:

```sh
npm run build && node ./build/src/index.js
```

### Create a new file

```sh
zk file <name>  # or path/to/name
```

This command creates `name.js` and `name.test.js`.

For convenience, when you run this command in your project's _root_ directory creates the files inside your project's `src` dir automatically, even if you don't specify `src/` as part of your file path.

When you run this command when you are _not_ in your project's
root dir, files are created at the path you specify relative to your terminal's current working directory.

### Show system info

```sh
zk system
```

This command outputs system info such as your NodeJS version, NPM version, `zkapp-cli` version, and so on. For easier troubleshooting, be sure to include this information if submitting a bug report for `zkapp-cli`. See the [CONTRIBUTING](https://github.com/o1-labs/zkapp-cli/blob/main/README.md) guidelines.

### Update your config.json

```sh
zk config
```

The auto-generated `config.json` file contains your deployment-related configurations.

Run the `zk config` command to add a new deployment configuration to this file.

Respond to the interactive command prompts to build or update a deploy alias.

A deploy alias consists of:

- A self-describing name. This tutorial uses `berkeley`. The deploy alias name can be anything and does not have to match the network name.
- The Mina GraphQL API URL that defines the network that receives your deploy transaction and broadcasts it to the appropriate Mina network (Testnet, Devnet, Mainnet, and so on)
- The transaction fee (in MINA) to use when deploying
- Two key pairs:

  - A key pair for the zkApp account. Public and private keys to use in your application are automatically generated in `keys/berkeley.json`.

  - A key pair to use as a fee payer account for updates and deployments. Public and private keys are stored on your local computer and can be used across multiple projects.

- Fee payer account alias

  A fee payer account is required. If you don't have a fee payer account, you are prompted to select one of these options:

  - Recover a fee payer account from an existing base58 private key
  - Create a new fee payer key pair

### Deploy your smart contract

```sh
zk deploy <alias>
// OR
zk deploy // shows a list of aliases in your project to choose from
```

_**Deployment is supported only to Berkeley Testnet and Testworld Mission 2.0, the Protocol Performance Testing program.
zkApp programmability is not yet available on the Mina Mainnet.**_

After you run `zk config`, the `zk deploy` command allows you to deploy a smart contract to a specified deploy alias.

Note: When you deploy to an alias for the first time, you are prompted to choose which smart contract you want to deploy from those that exist as _named_ exports in your project. The name of the smart contract that you choose is remembered by being saved into your `config.json` for this alias. For safety, the next time you run `zk deploy <alias>` this _same_ smart contract automatically deploys to this alias. See [Tutorial 3: Deploy to a Live Network](https://docs.minaprotocol.com/zkapps/tutorials/deploying-to-a-network).

## License

[Apache-2.0](https://github.com/o1-labs/zkapp-cli/blob/main/LICENSE)
