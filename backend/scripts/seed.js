require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const users = [
  { name: 'Admin User',              email: 'admin@sunlit.com',       phone: '9000000001', role: 'admin',                 password: 'Test@123' },
  { name: 'Sales Person',            email: 'sales@sunlit.com',       phone: '9000000002', role: 'sales_person',          password: 'Test@123' },
  { name: 'Sales Head',              email: 'saleshead@sunlit.com',   phone: '9000000003', role: 'sales_head',            password: 'Test@123' },
  { name: 'Front Office Executive',  email: 'foe@sunlit.com',         phone: '9000000004', role: 'front_office_executive', password: 'Test@123' },
  { name: 'Product Head',            email: 'product@sunlit.com',     phone: '9000000005', role: 'product_head',          password: 'Test@123' },
  { name: 'Service Engineer',        email: 'service@sunlit.com',     phone: '9000000006', role: 'service_engineer',      password: 'Test@123' },
  { name: 'Marketing Coordinator',   email: 'marketing@sunlit.com',   phone: '9000000007', role: 'marketing_coordinator', password: 'Test@123' },
  { name: 'Accounts Department',     email: 'accounts@sunlit.com',    phone: '9000000008', role: 'accounts_department',   password: 'Test@123' },
  { name: 'Test Customer',           email: 'customer@sunlit.com',    phone: '9000000009', role: 'customer',              password: 'Test@123', whatsapp: '9000000009' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to', mongoose.connection.host);

  for (const u of users) {
    const exists = await User.findOne({ phone: u.phone });
    if (exists) {
      console.log(`  skip  ${u.role} (${u.phone} already exists)`);
      continue;
    }
    await User.create(u);
    console.log(`  added ${u.role} — ${u.email} / ${u.phone}`);
  }

  console.log('\nAll roles seeded. Password for all: Test@123');
  console.log('Login with email or phone.\n');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
