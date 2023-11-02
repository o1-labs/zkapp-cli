## Contributing

Welcome to the zkApp CLI open source repository. Thank you for being a part of the Mina ecosystem and for your interest in contributing to the zkApp CLI project.

o1js helps developers build apps powered by zero-knowledge (zk) cryptography. The best way to get started with o1js is to use the zkApp CLI to [write a zkApp](https://docs.minaprotocol.com/zkapps/how-to-write-a-zkapp).

The best way to contribute to the zkApp CLI is to help us test it broadly to ensure it works as expected on all platforms.

By contributing, you can help us improve the functionality and user experience of the zkApp CLI, which in turn helps you build better projects. To ensure a smooth and effective collaboration, please follow these contribution guidelines.

## Code of Conduct

All contributors agree to respect and follow the Mina Protocol [Code of Conduct](https://github.com/MinaProtocol/mina/blob/develop/CODE_OF_CONDUCT.md).


## Did you find a bug?

To see if others have also experienced the issue:

- Ask questions in the Mina Protocol Discord in the  [#zkapps-developers](https://discord.com/channels/484437221055922177/915745847692636181) channel on Mina Protocol Discord. 
- Check if the bug was already reported by searching on GitHub under [Issues](https://github.com/o1-labs/zkapp-cli/issues).

If you don't find an open issue addressing the problem, open a new one. Be sure to include a title and clear description, as much relevant information as possible, and the output of the `zk system` command. This information includes your OS, NodeJS, and zkapp-cli versions to help us reproduce the issue.

After you open an issue, it might not see activity immediately unless it is a "Everything is on Fire and the World is Coming to an End" kind of bug. That doesn't mean we don't care about your bug, just that there are a lot of issues and pull requests to get through. Other people with the same problem can find your issue, confirm the bug, and may collaborate with you on fixing it. If you know how to fix the bug, go ahead and open a pull request.

## Clone the Repository

To be able to contribute code, you must clone the `zkapp-cli` repository:

```sh
git clone https://github.com/o1-labs/zkapp-cli.git
cd zkapp-cli
git remote add upstream https://github.com/o1-labs/zkapp-cli.git
npm install
npm link # makes it available globally on your system
```

If you have previously run `npm link` against a different version of `zkapp-cli` (say, after the branches switch):

```sh
npm r zkapp-cli -g && npm install && npm run build --if-present && npm link
```

The `main` branch contains the development version of the code.

To create a new branch for your contributions:

```sh
git checkout -b upstream/main
```

Make your changes and commit:

```sh
git push origin <your-branch>
```

Create and submit your pull request against the `main` branch. 

To switch back to the released version of zkApp CLI:

```sh
npm i -g zkapp-cli`
```

### Pull Requests (PRs)

To contribute directly to this project repo, submit a PR.

Provide a helpful, informative PR title that includes the context and page you are updating. Each PR must address only one issue or feature.

Start by creating a draft pull request. Create your draft PR early, even if your work is just beginning or incomplete. Your draft PR indicates to the community that you're working on something and provides a space for conversations early in the development process. Merging is blocked for Draft PRs, so they provide a safe place to experiment and invite comments.

All pull requests must go through the code review process. As the PR submitter, you must address each comment and suggestion in the **Files changed** view during the review process.

If your PR is a fork, the code maintainers will merge the approved PR.

## Docs

The zkApp CLI is the primary way developers build zkApps.

The documentation and tutorials are the pathways to foundational knowledge. We welcome contributions to [zkApps Developer](https://docs.minaprotocol.com/zkapps) documentation. See the [Docs Contributing Guidelines](https://github.com/o1-labs/docs2/blob/main/CONTRIBUTING.md).
