#!/usr/bin/env node

/**
 * Send one or more WhatsApp template messages to a test number.
 *
 * Usage:
 *   node scripts/sendTestTemplates.js 919876543210
 *   node scripts/sendTestTemplates.js 919876543210 lead_assignment follow_up_reminder
 *   node scripts/sendTestTemplates.js --list
 *
 * Requires .env with WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WABA_ID.
 * The recipient must be a registered WhatsApp user and have accepted the test
 * template (or be in your approved recipient list) to receive template sends.
 */

require('dotenv').config();
const { sendLibraryTemplate, getWhatsAppTemplates } = require('../utils/sendWhatsApp');

// Example payloads (placeholder order MUST match the template's {{N}} variables).
const SAMPLES = {
  lead_assignment: {
    values: [['Test Sales Rep', 'Ravi Kumar', '9876543210', 'ravi@example.com', 'website', 'High']]
  },
  follow_up_reminder: {
    values: [['Test Sales Rep', 'Priya Sharma', '9876543210', '3']]
  },
  quotation_pending: {
    values: [['Test Sales Head', 'Q-2026-0001', 'Acme Solar', '250000', '2']]
  },
  hot_lead_alert: {
    values: [['Test Sales Rep', 'Rahul Verma', '9812345678', 'Interested in 10kW system, ready to buy']]
  },
  payment_received: {
    values: [['Test Accounts', 'Kiran Traders', '50000', 'Bank Transfer', 'INV-20260801-0001']]
  },
  payment_pending: {
    values: [['Test Accounts', 'Kiran Traders', '500000', 'INV-20260701-0001', '12']]
  },
  invoice_due: {
    values: [['Test Accounts', 'Sharma Solar', '300000', 'INV-20260805-0002', '2026-08-12', '5']]
  },
  installation_assignment: {
    values: [['PO-00001', 'Ramesh Patel', '12 Nehru Nagar, Coimbatore', '2026-08-01']]
  },
  installation_scheduled: {
    values: [['Test Engineer', 'Ramesh Kumar', '2026-08-02', 'PO-00002']]
  },
  installation_reminder: {
    values: [['Test Engineer', 'Suresh Kumar', '9876543210', '2026-08-03', 'PO-00003']]
  },
  urgent_customer_contact: {
    values: [['Test Engineer', 'Anil Kumar', '9876543210', 'Customer reported installation issue', 'PO-00004']]
  }
};

async function listTemplates() {
  const templates = await getWhatsAppTemplates();
  templates.forEach((t) => {
    console.log(`  • ${t.name} [${t.status}] (${t.language})`);
  });
  return templates;
}

async function sendOne(to, name, values) {
  try {
    const result = await sendLibraryTemplate({
      to,
      templateName: name,
      values,
      countryCode: '+91'
    });
    console.log(`✅ ${name}: ${result.messageId || 'sent'}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list' || args[0] === '-l') {
    await listTemplates();
    return;
  }

  const to = args[0];
  if (!to || !/^\d{6,15}$/.test(to)) {
    console.error('❌ Provide a recipient phone number (with country code, no +):');
    console.error('   node scripts/sendTestTemplates.js 919876543210');
    return;
  }

  const templates = await listTemplates();
  const names = Object.keys(SAMPLES);

  let targets = args.slice(1);
  if (targets.length === 0) targets = names;

  let sent = 0;
  for (const name of targets) {
    const sample = SAMPLES[name];
    if (!sample) {
      console.error(`❌ Unknown template: ${name}`);
      continue;
    }
    const remote = templates.find((t) => t.name === name);
    if (!remote) {
      console.error(`⏭️   ${name}: not present in library`);
      continue;
    }
    if (remote.status !== 'APPROVED' && remote.status !== 'ACTIVE') {
      console.error(`⏭️   ${name}: status is ${remote.status} (not APPROVED)`);
      continue;
    }
    for (const values of sample.values) {
      if (await sendOne(to, name, values)) sent++;
    }
  }

  console.log(`\n📊 Sent ${sent} template message(s) to ${to}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});