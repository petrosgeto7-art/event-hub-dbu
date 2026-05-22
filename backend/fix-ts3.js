const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const srcDir = path.join(__dirname, 'src');
const files = getFiles(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // fix req.params.foo
  if (content.match(/req\.params\.[a-zA-Z0-9_]+/)) {
    // Only replace if it doesn't already have `as string`
    content = content.replace(/(req\.params\.[a-zA-Z0-9_]+)(?!\s*as)/g, '($1 as string)');
    changed = true;
  }
  
  if (content.match(/req\.query\.[a-zA-Z0-9_]+/)) {
    content = content.replace(/(req\.query\.[a-zA-Z0-9_]+)(?!\s*as)/g, '($1 as string)');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
