const url = 'https://www.reddit.com/r/technology/.rss?limit=5';

async function main() {
  const response = await fetch(url, { method: 'GET' });
  console.log('STATUS', response.status);
  const text = await response.text();
  const start = text.indexOf('<item');
  const end = text.indexOf('</item>', start) + '</item>'.length;
  const firstItem = text.slice(start, end);
  console.log('FIRST_ITEM_XML_SNIPPET');
  console.log(firstItem.slice(0, 2000).replace(/\n/g, '\\n'));
  console.log('CONTAINS_<comments>:', /<comments>/.test(firstItem));
  console.log('CONTAINS_reddit:score:', /reddit:score/.test(firstItem));
  console.log('CONTAINS_reddit:comments:', /reddit:comments/.test(firstItem));
  console.log('CONTAINS_num_comments:', /num_comments/.test(firstItem));
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
