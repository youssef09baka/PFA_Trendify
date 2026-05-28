const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'backend');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      // skip node_modules and other vendored dirs
      if (name === 'node_modules' || name === '.git') continue;
      files.push(...walk(full));
    } else if (full.endsWith('.js')) {
      // skip test files
      if (full.includes('.test.') || full.endsWith('.spec.js')) continue;
      files.push(full);
    }
  }
  return files;
}

const files = walk(root);
console.log('Found', files.length, 'JS files.');

files.forEach((f) => {
  const base = path.basename(f);
  // avoid requiring files that start servers
  if (base === 'server.js') {
    console.log('[SKIP] ', f);
    return;
  }
  try {
    require(f);
    console.log('[OK] ', f);
  } catch (err) {
    console.error('[ERR]', f, err && err.message ? err.message : err);
  }
});

console.log('Done');
