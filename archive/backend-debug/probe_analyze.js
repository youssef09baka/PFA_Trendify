const axios = require('axios');

(async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTc3MmZlYTBkYzMwNGJmMDEzNTY3OSIsImlhdCI6MTc3OTkyMTY2MiwiZXhwIjoxNzgwNTI2NDYyfQ.daIukIf9X_aHGylGjdiILefll3a3xNWQbo9aMgLj_Dw';
  const id = '6a14fb1f008f2ed2f1b4a26e';
  try {
    const res = await axios.post(`http://localhost:3000/api/feed/${id}/analyze`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STATUS', res.status);
    console.log('AI REMAINING', res.data.aiRemaining);
    console.log('TREND', JSON.stringify(res.data.trend, null, 2));
    console.log('ANALYSIS', JSON.stringify(res.data.analysis, null, 2));
  } catch (e) {
    console.error('ERR', e.response?.status, JSON.stringify(e.response?.data, null, 2) || e.message);
    process.exit(1);
  }
})();
