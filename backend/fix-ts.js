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

  // Fix req.query.foo as string
  if (content.match(/req\.query\.[a-zA-Z0-9_]+\s*as\s*string/)) {
    content = content.replace(/(req\.query\.[a-zA-Z0-9_]+)\s*as\s*string/g, '$1 as unknown as string');
    changed = true;
  }
  
  if (content.match(/req\.query\.[a-zA-Z0-9_]+\s*as\s*Role/)) {
    content = content.replace(/(req\.query\.[a-zA-Z0-9_]+)\s*as\s*Role/g, '$1 as unknown as Role');
    changed = true;
  }

  // sendSuccess with message string in place of statusCode
  if (content.match(/sendSuccess\(res,\s*([^,]+),\s*(['"][^'"]+['"])\)/)) {
    content = content.replace(/sendSuccess\(res,\s*([^,]+),\s*(['"][^'"]+['"])\)/g, 'sendSuccess(res, $1, 200, { message: $2 })');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}
