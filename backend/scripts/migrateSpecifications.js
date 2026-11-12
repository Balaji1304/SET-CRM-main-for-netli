/**
 * One-time migration: fix products/customized products whose `specifications`
 * field was saved as a JSON string (or double-stringified JSON) instead of an object.
 *
 * Usage:  node scripts/migrateSpecifications.js [--dry-run]
 */
const mongoose = require('mongoose');
require('dotenv').config();
const parseSpecs = require('../utils/parseSpecs');

const DRY_RUN = process.argv.includes('--dry-run');

async function connectDB() {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-crm';
  if (uri.endsWith('/')) uri += 'solar-crm';
  else if (!uri.includes('/', 10)) uri += '/solar-crm';
  await mongoose.connect(uri, { dbName: 'solar-crm' });
  console.log('Connected to MongoDB');
}

async function fixCollection(collectionName) {
  const col = mongoose.connection.collection(collectionName);
  const cursor = col.find({ specifications: { $type: 'string' } });
  let fixed = 0;

  for await (const doc of cursor) {
    const parsed = parseSpecs(doc.specifications);
    if (DRY_RUN) {
      console.log(`[DRY RUN] ${collectionName} ${doc._id}: "${String(doc.specifications).slice(0, 60)}..." -> ${JSON.stringify(parsed).slice(0, 80)}`);
    } else {
      await col.updateOne({ _id: doc._id }, { $set: { specifications: parsed } });
    }
    fixed++;
  }

  return fixed;
}

async function main() {
  await connectDB();
  if (DRY_RUN) console.log('=== DRY RUN (no writes) ===\n');

  const collections = ['products', 'customizedproducts'];
  let total = 0;

  for (const name of collections) {
    const count = await fixCollection(name);
    console.log(`${name}: ${count} document(s) ${DRY_RUN ? 'would be' : ''} fixed`);
    total += count;
  }

  console.log(`\nTotal: ${total} document(s) ${DRY_RUN ? 'would be' : ''} fixed`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
