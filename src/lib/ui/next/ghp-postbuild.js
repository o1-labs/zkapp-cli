const fs = require('fs');
const path = require('path');

// This script modifies the built CSS files and prepends the repo-name to the asset URLs.
// to be compatible with github pages deployment.
const cssDir = path.join(__dirname, '/out/_next/static/css');

// Update your repository name here if it is different from the project name.
let repoURL = '';
const files = fs.readdirSync(cssDir);

files.forEach((file) => {
  if (path.extname(file) === '.css') {
    const filePath = path.join(cssDir, file);

    const data = fs.readFileSync(filePath, 'utf8');

    const singleQuoteRegex = new RegExp(`url\\(\\s*'\\/(?!${repoURL})`, 'g');
    const doubleQuoteRegex = new RegExp(`url\\(\\s*"\\/(?!${repoURL})`, 'g');

    let result = data.replace(singleQuoteRegex, `url('/${repoURL}/`);
    result = result.replace(doubleQuoteRegex, `url("/${repoURL}/`);

    fs.writeFileSync(filePath, result, 'utf8');
  }
});
