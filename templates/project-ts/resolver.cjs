module.exports = (request, options) => {
  return options.defaultResolver(request, {
    ...options,
    packageFilter: (pkg) => {
      // When importing snarkyjs, we specify the Node ESM import as Jest by default imports the web version
      let snarkyNodeESM;
      if (pkg.name === 'snarkyjs') {
        snarkyNodeESM = pkg.exports.node.import;
      }
      return {
        ...pkg,
        main: snarkyNodeESM ? snarkyNodeESM : pkg.module || pkg.main,
      };
    },
  });
};
