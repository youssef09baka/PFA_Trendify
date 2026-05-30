const fs = require('fs');
const text = fs.readFileSync('ml-model/data/Redit_data.csv','utf8');
const rows = text.trim().split('\n');
const header = rows.shift().split(',');
const vi = header.indexOf('viral');
const counts = {};
rows.forEach(line => {
  if (!line.trim()) return;
  const cols = line.split(',');
  const v = cols[vi];
  if (!v) return;
  counts[v] = (counts[v] || 0) + 1;
});
console.log(JSON.stringify(counts, null, 2));
