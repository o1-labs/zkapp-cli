# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/o1-labs/zkapp-cli/compare/feature/deploy-alias...HEAD)

## [0.4.15] - 2021-09-015

### Changed

- Upgraded SnarkyJS to `0.6.0`. [#249](https://github.com/o1-labs/zkapp-cli/pull/249)
- Renamed the references of Party to AccountUpdate and parties to zkappCommand in CLI and template/examples to match changes in Mina Protocol and SnarkyJS.

## [0.4.7] - 2021-06-14

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
