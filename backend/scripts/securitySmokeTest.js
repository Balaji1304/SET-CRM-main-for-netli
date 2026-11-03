// Security smoke test: attack-style checks for the access-control and payment fixes.
// Run against a LOCAL server and a LOCAL/throwaway MongoDB only (it seeds test users and data).
// Usage: start the backend (npm run dev), then: node scripts/securitySmokeTest.js
// The last check trips the login rate limiter; restart the backend before running it again.
// Requires in .env: MONGODB_URI, JWT_SECRET, WHATSAPP_APP_SECRET (any test value).
const path = require('path');
const BACKEND = process.argv[2] || path.join(__dirname, '..');
require(path.join(BACKEND, 'node_modules/dotenv')).config({ path: path.join(BACKEND, '.env') });
const mongoose = require(path.join(BACKEND, 'node_modules/mongoose'));
const crypto = require('crypto');
const User = require(path.join(BACKEND, 'models/User'));

const API = process.env.API_URL || 'http://localhost:5000/api';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

const req = async (method, url, { token, body, headers = {}, raw } = {}) => {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (raw !== undefined) { payload = raw; h['Content-Type'] = h['Content-Type'] || 'application/json'; }
  else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
  const r = await fetch(API + url, { method, headers: h, body: payload });
  let data = null; try { data = await r.json(); } catch (_) {}
  return { status: r.status, data, headers: r.headers };
};

const login = async (email, password) => (await req('POST', '/auth/login', { body: { email, password } })).data?.token;

(async () => {
  if (!/127\.0\.0\.1|localhost/.test(process.env.MONGODB_URI || '')) {
    console.error('Refusing to run: MONGODB_URI must point to a local database');
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'solar-crm' });
  const db = mongoose.connection.db;
  const tag = Date.now().toString().slice(-6);
  const mk = async (name, role, extra = {}) => {
    const email = `${name.replace(/\W/g, '').toLowerCase()}${tag}@example.com`;
    await User.create({ name, email, phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`, password: 'Passw0rd!x', role, ...extra });
    return { email, token: await login(email, 'Passw0rd!x'), user: await User.findOne({ email }) };
  };

  const admin = await mk('Admin T', 'admin');
  const salesA = await mk('Sales A', 'sales_person');
  const salesB = await mk('Sales B', 'sales_person');
  const accounts = await mk('Accounts', 'accounts_department');
  const foe = await mk('Front Office', 'front_office_executive');
  const cust1 = await mk('Cust One', 'customer');
  const cust2 = await mk('Cust Two', 'customer');

  // Seed data directly (bypassing the heavy validation of the real flows)
  const leadId = new mongoose.Types.ObjectId();
  await db.collection('leads').insertOne({ _id: leadId, firstName: 'Lead', phone: `91${tag}11`, email: cust1.email, createdBy: salesA.user._id });
  const qSent = new mongoose.Types.ObjectId();
  const qDraftA = new mongoose.Types.ObjectId();
  await db.collection('quotations').insertMany([
    { _id: qSent, lead: leadId, quotationNumber: `QT-S-${tag}`, total: 100000, status: 'sent', validUntil: new Date(Date.now() + 864e5), createdBy: salesA.user._id, advancePaymentStatus: 'PENDING', razorpayPaymentLinkId: 'plink_REAL_FOR_THIS_QUOTE', advancePaymentPercentage: 20 },
    { _id: qDraftA, lead: leadId, quotationNumber: `QT-D-${tag}`, total: 5000, status: 'draft', validUntil: new Date(Date.now() + 864e5), createdBy: salesA.user._id }
  ]);
  const c1 = new mongoose.Types.ObjectId();
  await db.collection('customers').insertOne({ _id: c1, leadId, user: cust1.user._id, firstName: 'Cust', email: cust1.email, phone: `92${tag}22` });
  const purchase = new mongoose.Types.ObjectId();
  await db.collection('customerpurchases').insertOne({ _id: purchase, purchaseID: `PO-${tag}`, customerId: c1, quotationId: qSent, advancePaid: 20000, totalAmount: 100000, remainingAmount: 80000, isFullyPaid: false, razorpayPaymentId: 'plink_PURCHASE_LINK' });

  // 1. Self-registration cannot pick a role
  const reg = await req('POST', '/auth/register', { body: { name: 'Evil', email: `evil${tag}@example.com`, phone: `98${tag}11`, password: 'Passw0rd!x', role: 'admin' } });
  const regUser = await User.findOne({ email: `evil${tag}@example.com` });
  check('Register with role=admin creates a customer', regUser && regUser.role === 'customer', `status ${reg.status}, role ${regUser && regUser.role}`);

  // 2. NoSQL operator injection on login
  const inj = await req('POST', '/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('Login with {$ne:null} operators is rejected', inj.status >= 400 && !inj.data?.token, `status ${inj.status}`);

  // 3. WhatsApp admin endpoints need auth
  for (const [m, u] of [['GET', '/whatsapp/status'], ['GET', '/whatsapp/test-config'], ['POST', '/whatsapp/refresh-token']]) {
    const r = await req(m, u);
    check(`${m} ${u} without login -> 401`, r.status === 401, `status ${r.status}`);
    const r2 = await req(m, u, { token: cust1.token });
    check(`${m} ${u} as customer -> 403`, r2.status === 403, `status ${r2.status}`);
  }

  // 4. WhatsApp webhook signature
  const whBody = JSON.stringify({ entry: [] });
  const noSig = await req('POST', '/whatsapp/webhook', { raw: whBody });
  check('WhatsApp webhook without signature -> 403', noSig.status === 403, `status ${noSig.status}`);
  const badSig = await req('POST', '/whatsapp/webhook', { raw: whBody, headers: { 'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64) } });
  check('WhatsApp webhook with forged signature -> 403', badSig.status === 403, `status ${badSig.status}`);
  if (process.env.WHATSAPP_APP_SECRET) {
    const sig = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(whBody).digest('hex');
    const good = await req('POST', '/whatsapp/webhook', { raw: whBody, headers: { 'X-Hub-Signature-256': sig } });
    check('WhatsApp webhook with valid signature -> 200', good.status === 200, `status ${good.status}`);
  }

  // 5. Razorpay webhook must be signed
  const rzp = await req('POST', '/payments/webhook', { raw: JSON.stringify({ event: 'payment_link.paid', payload: { payment_link: { id: 'plink_REAL_FOR_THIS_QUOTE' } } }) });
  check('Unsigned Razorpay webhook rejected', rzp.status === 400, `status ${rzp.status}`);

  // 6. Public manual payment confirmation cannot approve a quotation with unrelated/bogus payments
  const mc1 = await req('POST', '/quotations/manual-confirm', { body: { quotationId: qSent.toString(), paymentId: 'pay_attacker', paymentLinkId: 'plink_SOMEONE_ELSES' } });
  check('manual-confirm with another payment link -> 400', mc1.status === 400, `status ${mc1.status}`);
  const mc2 = await req('POST', '/quotations/manual-confirm', { body: { quotationId: qSent.toString(), paymentId: 'pay_bogus', paymentLinkId: 'plink_REAL_FOR_THIS_QUOTE' } });
  const qAfter = await db.collection('quotations').findOne({ _id: qSent });
  check('manual-confirm with bogus payment id does not approve', mc2.status >= 400 && qAfter.status === 'sent' && qAfter.advancePaymentStatus === 'PENDING', `status ${mc2.status}, quotation ${qAfter.status}/${qAfter.advancePaymentStatus}`);

  // 7. Customers cannot confirm offline payments or close quotations
  const off = await req('POST', `/quotations/${qSent}/offline-payment`, { token: cust1.token, body: { amount: 20000, paymentMethod: 'cash' } });
  check('Customer offline-payment -> 403', off.status === 403, `status ${off.status}`);
  const cls = await req('PUT', `/quotations/${qSent}/close`, { token: cust1.token, body: {} });
  check('Customer close quotation -> 403', cls.status === 403, `status ${cls.status}`);

  // 8. Customers cannot self-report payments
  const rec1 = await req('POST', '/payments/record', { token: cust1.token, body: { purchaseId: purchase.toString(), amount: 80000 } });
  check('Customer /payments/record -> 403', rec1.status === 403, `status ${rec1.status}`);
  const rec2 = await req('POST', `/customer-purchases/${purchase}/payment`, { token: cust1.token, body: { amountPaid: 80000 } });
  check('Customer /customer-purchases/:id/payment -> 403', rec2.status === 403, `status ${rec2.status}`);
  const pAfter = await db.collection('customerpurchases').findOne({ _id: purchase });
  check('Purchase balance unchanged after customer attempts', pAfter.remainingAmount === 80000 && !pAfter.isFullyPaid, `remaining ${pAfter.remainingAmount}`);

  // 9. Razorpay verify must use the purchase's own link
  const ver = await req('GET', `/payments/verify/${purchase}/plink_SOME_OTHER_LINK`, { token: cust1.token });
  check('Verify with a different payment link -> 400', ver.status === 400, `status ${ver.status} ${ver.data?.message || ''}`);

  // 10. Customers can only see their own purchases
  const own = await req('GET', `/customer-purchases/${purchase}`, { token: cust1.token });
  check('Customer can read own purchase', own.status !== 403, `status ${own.status}`);
  const other = await req('GET', `/customer-purchases/${purchase}`, { token: cust2.token });
  check("Customer cannot read another customer's purchase -> 403", other.status === 403, `status ${other.status}`);
  const otherPay = await req('GET', `/customer-purchases/${purchase}/payments`, { token: cust2.token });
  check("Customer cannot read another customer's payments -> 403", otherPay.status === 403, `status ${otherPay.status}`);
  const appr = await req('POST', `/customer-purchases/quotation/${qSent}/approve`, { token: cust1.token, body: {} });
  check('Customer convert/approve quotation -> 403', appr.status === 403, `status ${appr.status}`);
  const eng = await req('GET', '/customer-purchases/tasks/service-engineers', { token: cust1.token });
  check('Customer service-engineer list -> 403', eng.status === 403, `status ${eng.status}`);

  // 11. Enquiries are front-office only
  const enqC = await req('GET', '/enquiries', { token: cust1.token });
  check('Customer list enquiries -> 403', enqC.status === 403, `status ${enqC.status}`);
  const enqF = await req('GET', '/enquiries', { token: foe.token });
  check('Front office list enquiries -> 200', enqF.status === 200, `status ${enqF.status}`);
  const spC = await req('GET', '/enquiries/salespersons', { token: cust1.token });
  const spS = await req('GET', '/enquiries/salespersons', { token: salesA.token });
  check('Salesperson list: customer 403, staff 200', spC.status === 403 && spS.status === 200, `customer ${spC.status}, staff ${spS.status}`);

  // 12. Sales persons can only touch their own quotations; delete works (Mongoose 7 fix)
  const upB = await req('PUT', `/quotations/${qDraftA}`, { token: salesB.token, body: { quotationItems: [] } });
  check("Sales B cannot edit Sales A's quotation -> 403", upB.status === 403, `status ${upB.status}`);
  const delB = await req('DELETE', `/quotations/${qDraftA}`, { token: salesB.token });
  check("Sales B cannot delete Sales A's quotation -> 403", delB.status === 403, `status ${delB.status}`);
  const delA = await req('DELETE', `/quotations/${qDraftA}`, { token: salesA.token });
  const gone = !(await db.collection('quotations').findOne({ _id: qDraftA }));
  check('Sales A can delete own draft (previously crashed)', delA.status === 200 && gone, `status ${delA.status}`);

  // 13. Deactivated users lose access immediately
  await User.updateOne({ _id: salesB.user._id }, { isActive: false });
  const deact = await req('GET', '/quotations', { token: salesB.token });
  check('Deactivated user token -> 401', deact.status === 401, `status ${deact.status}`);

  // 14. Regex injection in user search is neutralised
  const t0 = Date.now();
  const rx = await req('GET', '/users/manage?search=' + encodeURIComponent('(a+)+$[') , { token: admin.token });
  check('Regex metacharacters in search are safe', rx.status === 200 && Date.now() - t0 < 2000, `status ${rx.status}, ${Date.now() - t0}ms`);

  // 15. Upload type restriction
  const fd = new FormData();
  fd.append('name', 'x'); fd.append('brochure', new Blob(['MZ evil'], { type: 'application/x-msdownload' }), 'evil.exe');
  const up = await fetch(API + '/products', { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` }, body: fd });
  check('Brochure upload of .exe rejected -> 400', up.status === 400, `status ${up.status}`);

  // 16. Security headers
  const hdr = await req('GET', '/products');
  check('Security headers present (helmet)', hdr.headers.get('x-content-type-options') === 'nosniff' && !hdr.headers.get('x-powered-by'), `nosniff=${hdr.headers.get('x-content-type-options')}`);

  // 17. Login brute force is rate limited
  let limited = false;
  for (let i = 0; i < 25; i++) {
    const r = await req('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrong' } });
    if (r.status === 429) { limited = true; break; }
  }
  check('Repeated failed logins are rate limited (429)', limited);

  await mongoose.disconnect();
  const failed = results.filter(r => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
