#!/usr/bin/env node
/**
 * Copies WhatsApp contact fields from each customer's lead onto the Customer record.
 * Customers used to be created without them, so all of them defaulted to preferredContactMethod 'email'
 * and would never receive lifecycle WhatsApp messages.
 * Run: node scripts/backfillCustomerContactPrefs.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');

const FIELDS = ['preferredContactMethod', 'hasWhatsapp', 'whatsapp', 'whatsappSameAsPhone', 'whatsappOptIn', 'countryCode'];
const dryRun = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const customers = await db.collection('customers').find({ leadId: { $ne: null } }).toArray();
  let changed = 0;

  for (const c of customers) {
    const lead = await db.collection('leads').findOne({ _id: c.leadId }, { projection: Object.fromEntries(FIELDS.map(f => [f, 1])) });
    if (!lead) continue;
    const update = {};
    for (const f of FIELDS) {
      if (lead[f] !== undefined && lead[f] !== null && lead[f] !== '' && lead[f] !== c[f]) update[f] = lead[f];
    }
    if (!Object.keys(update).length) continue;
    changed += 1;
    const show = (k, v) => (k === 'whatsapp' && v ? `***${String(v).slice(-4)}` : JSON.stringify(v));
    console.log(`${dryRun ? '[dry run] ' : ''}customer ${c._id}: ${Object.entries(update).map(([k, v]) => `${k} ${show(k, c[k])} -> ${show(k, v)}`).join(', ')}`);
    if (!dryRun) await db.collection('customers').updateOne({ _id: c._id }, { $set: update });
  }

  console.log(`\n${customers.length} customers with a lead checked, ${changed} ${dryRun ? 'would be' : ''} updated.`);
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
