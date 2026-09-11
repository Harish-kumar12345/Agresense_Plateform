const axios = require('axios');

async function testAuthLogin() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'officer@example.com',
      password: 'password123',
      role: 'officer'
    });
    console.log('✅ /api/auth/login success! User:', res.data.user);
    console.log('✅ Token:', res.data.token.substring(0, 30) + '...');
  } catch (err) {
    console.error('❌ /api/auth/login failed:', err.response?.data || err.message);
  }
}

testAuthLogin();
