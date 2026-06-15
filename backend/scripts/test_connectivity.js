const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testConnectivity() {
  console.log(`Testing connectivity to ${API_BASE_URL}...`);
  
  try {
    // Try simple health check or just connect
    const response = await axios.get(`${API_BASE_URL}/api/trends`, { 
      timeout: 5000 
    });
    console.log('✅ Backend is responding');
    console.log(`Status: ${response.status}`);
    console.log(`Trends available: ${response.data?.trends?.length || response.data?.length || 0}`);
  } catch (error) {
    console.error('❌ Backend connection failed');
    console.error(`URL: ${API_BASE_URL}`);
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else if (error.code) {
      console.error(`Code: ${error.code}`);
    }
  }
}

testConnectivity();
