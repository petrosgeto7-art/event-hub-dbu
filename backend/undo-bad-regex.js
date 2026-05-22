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

  const fixes = [
    { bad: /\(req\.params\.eventI as string\)d as string/g, good: '(req.params.eventId as string)' },
    { bad: /\(req\.params\.i as string\)d as string/g, good: '(req.params.id as string)' },
    { bad: /\(req\.params\.slu as string\)g as string/g, good: '(req.params.slug as string)' },
    { bad: /\(req\.params\.registrationI as string\)d as string/g, good: '(req.params.registrationId as string)' },
    { bad: /\(req\.query\.search as string\) as string/g, good: '(req.query.search as string)' },
    { bad: /\(req\.query\.role as string\) as Role/g, good: '(req.query.role as any as Role)' },
    { bad: /\(req\.query\.status as string\) as string/g, good: '(req.query.status as string)' },
    { bad: /\(req\.query\.eventId as string\) as string/g, good: '(req.query.eventId as string)' },
    { bad: /\(req\.query\.type as string\) as string/g, good: '(req.query.type as string)' },
  ];

  for (const {bad, good} of fixes) {
    if (content.match(bad)) {
      content = content.replace(bad, good);
      changed = true;
    }
  }
  
  if (content.includes('as string) as string')) {
      content = content.replace(/\(req\.query\.([a-zA-Z0-9_]+) as string\) as string/g, '(req.query.$1 as string)');
      changed = true;
  }
  
  if (content.includes('as string) as unknown as string')) {
      content = content.replace(/\(req\.query\.([a-zA-Z0-9_]+) as string\) as unknown as string/g, '(req.query.$1 as string)');
      changed = true;
  }
  
  if (content.includes('as string) as any as Role')) {
      content = content.replace(/\(req\.query\.([a-zA-Z0-9_]+) as string\) as any as Role/g, '(req.query.$1 as any as Role)');
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
