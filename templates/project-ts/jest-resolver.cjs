module.exports = (request, options) => {
  return options.defaultResolver(request, {
    ...options,
    packageFilter: (pkg) => {
      // When importing snarkyjs, we specify the Node ESM import as Jest by default imports the web version
      if (pkg.name === 'snarkyjs') {
        return {
          ...pkg,
          main: pkg.exports.node.import,
        };
      }
      if (pkg.name === 'node-fetch') {
        return { ...pkg, main: pkg.main };
      }
      return {
        ...pkg,
        main: pkg.module || pkg.main,
      };
    },
  });
};
