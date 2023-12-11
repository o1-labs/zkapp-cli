# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Possible subsections:
    _Added_ for new features.
    _Changed_ for changes in existing functionality.
    _Deprecated_ for soon-to-be removed features.
    _Removed_ for now removed features.
    _Fixed_ for any bug fixes.
    _Security_ in case of vulnerabilities.
 -->

## Unreleased

## [0.16.0] - 2023-12-11

### Added

- Possibility to configure the `lightnet` Mina processes logging level. [#536](https://github.com/o1-labs/zkapp-cli/pull/536)

### Changed

- Updates the Github Pages UI scaffold deploy flow configuration in the `next.config.js` to be compatible with the current version of NextJS. [#534](https://github.com/o1-labs/zkapp-cli/pull/534)

### Fixed

- Fix to allow a deployment to Github Pages using the npm run deploy command in a NextJS UI project[#534](https://github.com/o1-labs/zkapp-cli/pull/534).

## [0.15.2] - 2023-12-04

### Added

- Lightnet sub-commands implementation (`explorer`). [#521](https://github.com/o1-labs/zkapp-cli/pull/521)

## [0.15.1] - 2023-11-29

### Added

- Lightnet sub-commands implementation (`logs`). [#520](https://github.com/o1-labs/zkapp-cli/pull/520)

## [0.15.0] - 2023-11-07

### Added

- Lightnet sub-commands implementation (`start`/`stop`/`status`). [#510](https://github.com/o1-labs/zkapp-cli/pull/510)

## [0.14.1] - 2023-11-03

### Changed

- Explorer links for deployment and interaction transactions. [#516](https://github.com/o1-labs/zkapp-cli/pull/516)

## [0.14.0] - 2023-10-31

### Changed

- Release `0.14.0` corresponding with o1js [release](https://github.com/o1-labs/o1js/pull/1209) `0.14.0`. The o1js release includes constraint optimizations in Field methods and core crypto changes that break all verification keys. All contracts need to be redeployed. See the docs for more guidance on [deploying](https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp) contracts. [#514](https://github.com/o1-labs/zkapp-cli/pull/514)
  - o1js minor version dependency updated in cli package.json to 0.14.\*.
  - o1js minor version peer dependency updated in template/example contract package.json to 0.14.\*.

## [0.13.2] - 2023-10-22

### Changed

- The husky pre-commit hooks configuration steps during project generation with an accompanying UI project were removed. [#507](https://github.com/o1-labs/zkapp-cli/pull/507).

## [0.13.1] - 2022-10-20

### Changed

- This PR removes Husky and the pre-commit hooks from the project templates to remove friction and create a better DX when building zkApps. [#505](https://github.com/o1-labs/zkapp-cli/pull/505).

## [0.13.0] - 2023-09-14

### Changed

- Release `0.13.0` corresponding with o1js [release](https://github.com/o1-labs/o1js/pull/1123) `0.13.0`. The o1js release includes changes to verification keys caused by updates to the proof system, which breaks all deployed contracts. [#492](https://github.com/o1-labs/zkapp-cli/pull/492)
  - o1js minor version dependency updated in cli package.json to 0.13.\*.
  - o1js minor version peer dependency updated in template/example contract package.json to 0.13.\*.

## [0.12.1] - 2023-09-09

### Changed

- Both local and global installed versions are checked to determine if an update of the zkApp-cli is necessary[#448](https://github.com/o1-labs/zkapp-cli/pull/448).

### Fixed

- Fix to allow the zkApp-cli to be used from a projects local node_modules[#448](https://github.com/o1-labs/zkapp-cli/pull/448).

## [0.12.0] - 2023-09-09

### Changed

- Project migrated to ESM [#447](https://github.com/o1-labs/zkapp-cli/pull/447).

### Added

- E2E tests for critical user flows against mocked and real networks [#447](https://github.com/o1-labs/zkapp-cli/pull/447).

## [0.11.2] - 2023-09-05

### Changed

- Update all instances of `SnarkyJS` to `o1js` throught the CLI to coincide with the rebrand of the package [#481](https://github.com/o1-labs/zkapp-cli/pull/481)

## [0.11.1] - 2023-08-16

### Added

- A post build script was added to prepend a project repo name to built css asset urls so a NextJS UI project can be correctly deployed to GitHub Pages [#468](https://github.com/o1-labs/zkapp-cli/pull/468)

### Fixed

- A fix to deploy a NextJS UI project to GitHub Pages without manual configuration by running `npm run deploy` [#468](https://github.com/o1-labs/zkapp-cli/pull/468)

## [0.11.0] - 2023-07-14

### Changed

- Release `0.11.0` [#459](https://github.com/o1-labs/zkapp-cli/pull/459)
  - o1js minor version dependency updated in cli package.json to 0.12.\*.
  - o1js minor version peer dependency updated in template/example contract package.json to 0.12.\*.

## [0.10.2] - 2023-07-09

### Changed

- Welcome page getting started text changed for the zkApp project generated with the `NextJS` UI framework ([#450](https://github.com/o1-labs/zkapp-cli/issues/450))

## Fixed

- Fix for zkApp project generation with `Nuxt` UI framework issue ([#449](https://github.com/o1-labs/zkapp-cli/issues/449))

## [0.10.1] - 2023-06-22

### Changed

- Update cli prompt language and upgrade version instructions [#437](https://github.com/o1-labs/zkapp-cli/pull/437) & [#438](https://github.com/o1-labs/zkapp-cli/pull/438)

## [0.10.0] - 2023-06-20

## Added

- Third-party fee payer accounts for deployment transactions can be used across multiple projects [#424](https://github.com/o1-labs/zkapp-cli/pull/424)
  - A new `zk config` option creates or selects a third-party fee payer account.

## Fixed

- A fee payer tries to pay the fee using signature authorization (proofs are not supported). If the zkApp account is used as fee payer after deployment, the transaction was rejected because the permissions of the account would be violated, breaking all re-deployments and the interact.ts script in the template project. [#424](https://github.com/o1-labs/zkapp-cli/pull/424)

## [0.9.1] - 2023-06-17

### Changed

- Update the Svelte UI scaffold vite config. [#432] (https://github.com/o1-labs/zkapp-cli/pull/432)

## [0.9.0] - 2023-06-06

### Changed

- Release `0.9.0` [#426](https://github.com/o1-labs/zkapp-cli/pull/426)
  - o1js minor version dependency updated in cli package.json to 0.11.\*.
  - o1js minor version peer dependency updated in template/example contract package.json to 0.11.\*.
  - Replace deprecated `Circuit.if` with `Provable.if` in the `tictactoe` example.
  - Replace deprecated `Circuit.array` with `Provable.Array` in the `sudoku` example.

## [0.8.2] - 2023-05-12

### Changed

- Clean up deploy and log full errors to the console. [#408](https://github.com/o1-labs/zkapp-cli/pull/408)

## [0.8.1] - 2023-05-03

### Changed

- Update NextJS UI scaffold defaults. [#402](https://github.com/o1-labs/zkapp-cli/pull/402)

## [0.8.0] - 2023-05-03

### Changed

- Release `0.8.0` [#399](https://github.com/o1-labs/zkapp-cli/pull/399)

  - Remove deprecated isReady and shutdown from cli, template/examples contracts, and UI scaffolds for each supported framework.
  - Add state.getAndAssertEquals() to examples and test contracts.
  - Configure UI scaffolds for NextJS, Svelte, and Nuxt to support top-level await used in the latest o1js release.
  - Exit the cli config and deploy processes on success and error.
  - Increase the template/example project jest test timeout.

- Update interact script config field. [#396](https://github.com/o1-labs/zkapp-cli/pull/396)

- Update help text. [#392](https://github.com/o1-labs/zkapp-cli/pull/392)

## [0.7.6] - 2023-04-25

### Changed

- Remove postinstall script to speed up zkApp cli installations and upgrades [#391](https://github.com/o1-labs/zkapp-cli/pull/391)

- UI scaffold updates. [#388](https://github.com/o1-labs/zkapp-cli/pull/388)

### Added

- Landing page with next steps for Nuxt UI scaffold. [#386](https://github.com/o1-labs/zkapp-cli/pull/386)

- Landing page with next steps for Svelte UI scaffold. [#385](https://github.com/o1-labs/zkapp-cli/pull/385)

- Landing page with next steps for NextJS UI scaffold. [#384](https://github.com/o1-labs/zkapp-cli/pull/384)

## [0.7.5] - 2023-03-16

### Added

- Adds an Interactive flow for UI scaffolds. [#382](https://github.com/o1-labs/zkapp-cli/pull/382)

## [0.7.4] - 2023-03-011

### Changed

- Bug fixes. [#378](https://github.com/o1-labs/zkapp-cli/pull/378)

## [0.7.3] - 2023-03-09

### Changed

- Updates the template projects to use the o1js version of `0.9.*`. [#376](https://github.com/o1-labs/zkapp-cli/pull/376)

## [0.7.2] - 2023-03-07

### Changed

- Upgraded o1js to `0.9.2`. [#367](https://github.com/o1-labs/zkapp-cli/pull/367)

## [0.7.1] - 2023-02-27

- Update for o1js state getting fix. [#367](https://github.com/o1-labs/zkapp-cli/pull/367)

## [0.7.0] - 2023-02-14

### Changed

- Upgraded o1js to `0.9.0`. [#367](https://github.com/o1-labs/zkapp-cli/pull/367)

## [0.6.3] - 2023-02-14

### Changed

- Add timeout to warm gittar cache step during zkapp-cli install or upgrade. [#362](https://github.com/o1-labs/zkapp-cli/pull/362)

- Update 'networks' in config.json to 'deployAliases'. [#360](https://github.com/o1-labs/zkapp-cli/pull/360)

## [0.6.2] - 2023-02-02

### Added

- Show desired blockchain explorer transaction urls [#358](https://github.com/o1-labs/zkapp-cli/pull/358)

## [0.6.1] - 2023-01-030

### Changed

- Bug fixes. [#353](https://github.com/o1-labs/zkapp-cli/pull/347)

## [0.6.0] - 2023-01-018

### Changed

- Upgraded o1js to `0.8.0`. [#349](https://github.com/o1-labs/zkapp-cli/pull/347)

## [0.5.5] - 2023-01-011

### Changed

- Fix to show o1js version with `zk system` command. [#349](https://github.com/o1-labs/zkapp-cli/pull/349)
- Allow '.js' imports to work in Jest. [#339](https://github.com/o1-labs/zkapp-cli/pull/339)
- Minor fix to exit the cli process after generating a new project. [#330](https://github.com/o1-labs/zkapp-cli/pull/330)

### Added

- Add dropdown to select an example project. [#348](https://github.com/o1-labs/zkapp-cli/pull/348)
- Show a warning when users must upgrade their zkApp-cli version. [#327](https://github.com/o1-labs/zkapp-cli/pull/327)
- Add a `tsc watch` script. [#326](https://github.com/o1-labs/zkapp-cli/pull/326)

## [0.5.4] - 2022-12-01

### Changed

- Fix build errors when using `zk file`. [#325](https://github.com/o1-labs/zkapp-cli/pull/325)

## [0.5.3]

### Changed

- Fix template contract, add interaction script, and upgrade to o1js `0.7.3`. [#320](https://github.com/o1-labs/zkapp-cli/pull/320)
- Fix tictactoe example. [#318](https://github.com/o1-labs/zkapp-cli/pull/318)

## [0.5.2]

### Changed

- Upgraded o1js to `0.7.2` [#316](https://github.com/o1-labs/zkapp-cli/pull/316)
- Fix Sudoku and enable CLI to create init() proofs. [#315](https://github.com/o1-labs/zkapp-cli/pull/315)

## [0.5.1]

### Changed

- Upgraded o1js to `0.7.1`. [#309](https://github.com/o1-labs/zkapp-cli/pull/309)
- Fix GraphQL error handling. [#307](https://github.com/o1-labs/zkapp-cli/pull/307/files)

## [0.5.0]

### Changed

- Upgraded o1js to `0.7.0`. [#306](https://github.com/o1-labs/zkapp-cli/pull/306)
- Update tsconfig ES target. [#303](https://github.com/o1-labs/zkapp-cli/pull/303)

### Added

- Import a smart contract into the Nuxt UI project scaffold. [#305](https://github.com/o1-labs/zkapp-cli/pull/305)
- Provide a better error message when an unknown error occurs in deployment. [#304](https://github.com/o1-labs/zkapp-cli/pull/304)
- Import a smart contract into the Svelte UI project scaffold. [#302](https://github.com/o1-labs/zkapp-cli/pull/302)

## [0.4.19] - 2022-11-04

## [0.4.18] - 2022-10-02

### Changed

- Exit the CLI when a project step fails. [#281](https://github.com/o1-labs/zkapp-cli/pull/281)
- Fix confirmation step to not consume user input entered earlier. [#265](https://github.com/o1-labs/zkapp-cli/pull/265)
- Set default verion of user's smart contract project to `0.1.0`. [#264](https://github.com/o1-labs/zkapp-cli/pull/264)
- Constrain valid example names for better error handling. [#263](https://github.com/o1-labs/zkapp-cli/pull/263)

### Added

- Add ability to generate UI project alongsde the smart contract.

  - Add an option to NextJS to set it up for github pages. [#292](https://github.com/o1-labs/zkapp-cli/pull/292)
  - Import a smart contract into the NextJS UI project scaffold. [#290](https://github.com/o1-labs/zkapp-cli/pull/290)
  - Fixes to the NextJS project for o1js + typescript. [#287](https://github.com/o1-labs/zkapp-cli/pull/287)
  - Add a NextJS typescript prompt. [#285](https://github.com/o1-labs/zkapp-cli/pull/285)
  - Add COOP & COEP headers for SvelteKit, NextJS, & NuxtJS. [#279](https://github.com/o1-labs/zkapp-cli/pull/279)
  - Working mvp of UI monorepo. [#266](https://github.com/o1-labs/zkapp-cli/pull/266)

- Add Github issue templates. [#270](https://github.com/o1-labs/zkapp-cli/pull/270), [#275](https://github.com/o1-labs/zkapp-cli/pull/275), & [#276](https://github.com/o1-labs/zkapp-cli/pull/276)

## [0.4.17] - 2022-10-07

### Changed

- Fix running `zk deploy` on windows. [#256](https://github.com/o1-labs/zkapp-cli/pull/256)

## [0.4.16] - 2022-9-026

### Changed

- Update readme. [#253](https://github.com/o1-labs/zkapp-cli/pull/253)

## [0.4.15] - 2022-09-015

### Changed

- Upgraded o1js to `0.6.0`. [#249](https://github.com/o1-labs/zkapp-cli/pull/249)
- Renamed the references of Party to AccountUpdate and parties to zkappCommand in CLI and template/examples to match changes in Mina Protocol and o1js.

## [0.4.7] - 2022-06-14

### Added

- Better error handling on unknown errors. [#207](https://github.com/o1-labs/zkapp-cli/pull/207)
- Contributing section in README. [#215](https://github.com/o1-labs/zkapp-cli/pull/215)

### Changed

- Upgraded o1js to `0.4.1`. [#207](https://github.com/o1-labs/zkapp-cli/pull/207)
- Renamed the deploy parameter `network` to `alias`. [#218](https://github.com/o1-labs/zkapp-cli/pull/218)
- Updated template and example file structure to support publishing to npm. [#213](https://github.com/o1-labs/zkapp-cli/pull/213)
- Fixed bug with CI not cleaning up node_modules after testing. [#219](https://github.com/o1-labs/zkapp-cli/pull/219)

## [0.3.7] - 2021-06-03
