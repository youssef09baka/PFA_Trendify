const axios = require('axios');

(async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTc3MmZlYTBkYzMwNGJmMDEzNTY3OSIsImlhdCI6MTc3OTkyMTY2MiwiZXhwIjoxNzgwNTI2NDYyfQ.daIukIf9X_aHGylGjdiILefll3a3xNWQbo9aMgLj_Dw';
  try {
    const res = await axios.get('http://localhost:3000/api/feed', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STATUS', res.status);
    console.log('META', res.data.meta);
    console.log('FIRST', JSON.stringify(res.data.items[0], null, 2));
  } catch (e) {
    console.error('ERR', e.response?.status, e.response?.data || e.message);
    process.exit(1);
  }
})();
