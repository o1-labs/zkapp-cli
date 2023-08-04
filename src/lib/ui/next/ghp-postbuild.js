const fs = require('fs');
const path = require('path');

// This script modifies the built CSS files and prepends the repo-name to the asset URLs.
// to be compatible with github pages deployment.
const cssDir = path.join(__dirname, '/.next/static/css');
// Add your repository name here.
let repoURL = '';
fs.readdir(cssDir, (err, files) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  files.forEach(file => {
    if (path.extname(file) === '.css') {
      const filePath = path.join(cssDir, file);
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        
        const result = data.replace(/url\(\//g, `url(/${repoURL}/`);

        fs.writeFile(filePath, result, 'utf8', err => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
        });
      });
    }
  });
});
