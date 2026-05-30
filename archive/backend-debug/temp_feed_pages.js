const http = require('http');

function api(path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => text += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: text ? JSON.parse(text) : null }); }
        catch (err) { resolve({ status: res.statusCode, data: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await api('/api/users/login', { email: 'debug.tester@example.com', password: 'Password123' });
  console.log('LOGIN_STATUS', login.status);
  const token = login.data && login.data.token;
  console.log('TOKEN_OK', Boolean(token));
  for (let page = 1; page <= 5; page++) {
    const res = await api('/api/feed?page=' + page + '&limit=24', null, { Authorization: 'Bearer ' + token });
    console.log('PAGE', page, 'STATUS', res.status, 'ITEMS', res.data && Array.isArray(res.data.items) ? res.data.items.length : 'N/A', 'META', JSON.stringify(res.data && res.data.meta));
  }
})();
