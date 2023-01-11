# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.5] - 2023-01-011

### Changed

- Fix to show SnarkyJS version with 'zk system' command. [#349](https://github.com/o1-labs/zkapp-cli/pull/349)
- Allow '.js' imports to work in Jest. [#339](https://github.com/o1-labs/zkapp-cli/pull/339)
- Minor fix to exit the cli process after generating a new project. [#330](https://github.com/o1-labs/zkapp-cli/pull/330)

### Added

- Add dropdown to select an example project. [#348](https://github.com/o1-labs/zkapp-cli/pull/348)
- Show a warning when users must upgrade their zkApp-cli version. [#327](https://github.com/o1-labs/zkapp-cli/pull/327)
- Add a 'tsc watch' script. [#326](https://github.com/o1-labs/zkapp-cli/pull/326)

## [0.5.4] - 2022-12-01

### Changed

- Fix build errors when using 'zk file'. [#325](https://github.com/o1-labs/zkapp-cli/pull/325)

## [0.5.3]

### Changed

- Fix template contract and add interaction script. [#320](https://github.com/o1-labs/zkapp-cli/pull/320)
- Fix tictactoe example. [#318](https://github.com/o1-labs/zkapp-cli/pull/318)

## [0.5.2]

### Changed

- Fix Sudoku and enable CLI to create init() proofs. [#315](https://github.com/o1-labs/zkapp-cli/pull/315)

## [0.5.1]

### Changed

- Upgraded SnarkyJS to `0.7.1`. [#309](https://github.com/o1-labs/zkapp-cli/pull/309)
- Fix GraphQL error handling. [#307](https://github.com/o1-labs/zkapp-cli/pull/307/files)

## [0.5.0]

### Changed

- Upgraded SnarkyJS to `0.7.0`. [#306](https://github.com/o1-labs/zkapp-cli/pull/306)
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
- Set default verion of user's smart contract project to 0.1.0. [#264](https://github.com/o1-labs/zkapp-cli/pull/264)
- Constrain valid example names for better error handling. [#263](https://github.com/o1-labs/zkapp-cli/pull/263)

### Added

- Add ability to generate UI project alongsde the smart contract.

  - Add an option to NextJS to set it up for github pages. [#292] https://github.com/o1-labs/zkapp-cli/pull/292)
  - Import a smart contract into the NextJS UI project scaffold. [#290](https://github.com/o1-labs/zkapp-cli/pull/290)
  - Fixes to the NextJS project for snarkyjs + typescript. [#287](https://github.com/o1-labs/zkapp-cli/pull/287)
  - Add a NextJS typescript prompt. [#285](https://github.com/o1-labs/zkapp-cli/pull/285)
  - Add COOP & COEP headers for SvelteKit, NextJS, & NuxtJS. [#279](https://github.com/o1-labs/zkapp-cli/pull/279)
  - Working mvp of UI monorepo. [#266](https://github.com/o1-labs/zkapp-cli/pull/266)

- Add Github issue templates. [#270](https://github.com/o1-labs/zkapp-cli/pull/270), [#275](https://github.com/o1-labs/zkapp-cli/pull/275), & [#276](https://github.com/o1-labs/zkapp-cli/pull/276)

## [0.4.17] - 2022-10-07

### Changed

- Fix running 'zk deploy' on windows. [#256](https://github.com/o1-labs/zkapp-cli/pull/256)

## [0.4.16] - 2022-9-026

### Changed

- Update readme. [#253](https://github.com/o1-labs/zkapp-cli/pull/253)

## [0.4.15] - 2022-09-015

### Changed

- Upgraded SnarkyJS to `0.6.0`. [#249](https://github.com/o1-labs/zkapp-cli/pull/249)
- Renamed the references of Party to AccountUpdate and parties to zkappCommand in CLI and template/examples to match changes in Mina Protocol and SnarkyJS.

## [0.4.7] - 2022-06-14

### Added

- Better error handling on unknown errors. [#207](https://github.com/o1-labs/zkapp-cli/pull/207)
- Contributing section in README. [#215](https://github.com/o1-labs/zkapp-cli/pull/215)

### Changed

- Upgraded SnarkyJS to `0.4.1`. [#207](https://github.com/o1-labs/zkapp-cli/pull/207)
- Renamed the deploy parameter `network` to `alias`. [#218](https://github.com/o1-labs/zkapp-cli/pull/218)
- Updated template and example file structure to support publishing to npm. [#213](https://github.com/o1-labs/zkapp-cli/pull/213)
- Fixed bug with CI not cleaning up node_modules after testing. [#219](https://github.com/o1-labs/zkapp-cli/pull/219)

## [0.3.7] - 2021-06-03

<!--
  Possible subsections:
    Added for new features.
    Changed for changes in existing functionality.
    Deprecated for soon-to-be removed features.
    Removed for now removed features.
    Fixed for any bug fixes.
    Security in case of vulnerabilities.
 -->
