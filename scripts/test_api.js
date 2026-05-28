const API_ROOT = 'http://localhost:3000/api';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, data: json };
}

async function test() {
  try {
    console.log('Signup test...');
    const email = `test+${Date.now()}@example.com`;
    const signup = await fetchJson(`${API_ROOT}/users/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
    });
    console.log('Signup status:', signup.status, signup.data && signup.data.user && signup.data.user.email);

    console.log('Login test...');
    const login = await fetchJson(`${API_ROOT}/users/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    console.log('Login status:', login.status);
    const token = login.data && login.data.token;
    if (!token) {
      console.error('No token returned', login.data);
      return;
    }

    console.log('Auth profile test...');
    const profile = await fetchJson(`${API_ROOT}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Profile loaded:', profile.status, profile.data && profile.data.email);

    console.log('Saved trends fetch (should be 200):');
    const saved = await fetchJson(`${API_ROOT}/users/saved-trends`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Saved trends status:', saved.status);

    console.log('All tests OK');
  } catch (err) {
    console.error('Test error:', err.message || err);
  }
}

test();
