import replace from 'replace-in-file';

// Workaround for https://github.com/gmrchk/cli-testing-library/pull/12

const options = {
  files: './node_modules/@gmrchk/cli-testing-library/lib/createExecute.js',
  from: /cwd: runFrom \? path_1.default.join\(base, runFrom\) : path_1\.default\.join\(base\),/g,
  to: 'cwd: runFrom ? path_1.default.join(base, runFrom) : path_1.default.join(base),\n                shell: true',
};

try {
  const os = process.platform;
  if (os === 'win32' || os === 'win64') {
    const results = await replace(options);
    console.log('Replacement results:', results);
  }
} catch (error) {
  console.error('Error occurred:', error);
}
