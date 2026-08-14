(async () => {
  try {
    const ts = Date.now();
    const registerBody = { name: `TestUser_${ts}`, email: `testuser_${ts}@example.test`, password: 'Password123!' };

    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerBody),
    });
    const reg = await regRes.json();
    console.log('REGISTER RESPONSE:', JSON.stringify(reg, null, 2));

    if (reg && reg.token) {
      const meRes = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${reg.token}` },
      });
      const me = await meRes.json();
      console.log('ME RESPONSE:', JSON.stringify(me, null, 2));
    } else {
      console.error('No token returned from register');
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment to run the admin login check.');
      process.exit(1);
    }

    const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const adminLogin = await adminLoginRes.json();
    console.log('ADMIN LOGIN RESPONSE:', JSON.stringify(adminLogin, null, 2));

    if (adminLogin && adminLogin.token) {
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminLogin.token}` },
      });
      const stats = await statsRes.json();
      console.log('ADMIN STATS:', JSON.stringify(stats, null, 2));
    } else {
      console.error('No admin token returned');
    }
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
})();
