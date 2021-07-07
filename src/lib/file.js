// Create `foo.js` and `foo.test.js` in current directory. Warn if already
// exists and do NOT overwrite.
module.exports = function (name) {
  console.log('Creating new file:', name);
};
