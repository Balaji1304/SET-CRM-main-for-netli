#!/usr/bin/env node

/**
 * Create WhatsApp message templates via the Cloud API.
 *
 * Usage:
 *   node scripts/createTemplates.js                 # create all templates
 *   node scripts/createTemplates.js --list          # only list existing templates
 *   node scripts/createTemplates.js lead_assignment # create a single template
 *
 * Requires .env with: WABA_ID, WHATSAPP_ACCESS_TOKEN (or system-user token).
 */

require('dotenv').config();
const { createWhatsAppTemplate, getWhatsAppTemplates } = require('../utils/sendWhatsApp');

// Each entry maps 1:1 to the names the role/team senders look up.
// The {{N}} placeholders MUST match the order of the values arrays in sendNotification.js.
const TEMPLATES = [
  // ---------- Sales team ----------
  {
    name: 'lead_assignment',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nYou have been assigned a new lead:\n\nName: {{2}}\nPhone: {{3}}\nEmail: {{4}}\nSource: {{5}}\nPriority: {{6}}\n\nPlease follow up at the earliest.',
        example: { body_text: [['Sales Rep', 'Ravi Kumar', '9876543210', 'ravi@example.com', 'website', 'High']] }
      }
    ]
  },
  {
    name: 'follow_up_reminder',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nReminder to follow up on lead:\n\nName: {{2}}\nPhone: {{3}}\nLast contact: {{4}} days ago\n\nPlease reach out today.',
        example: { body_text: [['Sales Rep', 'Priya Sharma', '9876543210', '3']] }
      }
    ]
  },
  {
    name: 'quotation_pending',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nA quotation is pending your approval:\n\nQuotation: {{2}}\nCustomer: {{3}}\nAmount: Rs. {{4}}\nWaiting: {{5}} days\n\nPlease review.',
        example: { body_text: [['Sales Head', 'Q-2026-0001', 'Acme Solar', '250000', '2']] }
      }
    ]
  },
  {
    name: 'hot_lead_alert',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nHOT LEAD ALERT\n\nName: {{2}}\nPhone: {{3}}\nReason: {{4}}\n\nPlease contact immediately.',
        example: { body_text: [['Sales Rep', 'Rahul Verma', '9812345678', 'Interested in 10kW system, ready to buy']] }
      }
    ]
  },

  // ---------- Accounts department ----------
  {
    name: 'payment_received',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nWe are pleased to confirm that the payment has been received successfully by our accounts department.\n\nCustomer name: {{2}}\nAmount received: Rs. {{3}}\nPayment method: {{4}}\nInvoice number: {{5}}\n\nThank you for keeping the records updated.',
        example: { body_text: [['Accounts Team', 'Kiran Traders', '50000', 'Bank Transfer', 'INV-20260801-0001']] }
      }
    ]
  },
  {
    name: 'payment_pending',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is a reminder to follow up on the payment that is still pending for the following invoice.\n\nCustomer name: {{2}}\nAmount due: Rs. {{3}}\nInvoice number: {{4}}\nDays overdue: {{5}}\n\nKindly contact the customer and update the status as soon as possible.',
        example: { body_text: [['Accounts Team', 'Kiran Traders', '500000', 'INV-20260701-0001', '12']] }
      }
    ]
  },
  {
    name: 'invoice_due',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nPlease be informed that the following invoice is due soon and needs to be processed in the system.\n\nCustomer name: {{2}}\nInvoice amount: Rs. {{3}}\nInvoice number: {{4}}\nDue date: {{5}}\nDays until due: {{6}}\n\nKindly send the reminder to the customer before the due date.',
        example: { body_text: [['Accounts Team', 'Sharma Solar', '300000', 'INV-20260805-0002', '2026-08-12', '5']] }
      }
    ]
  },

  // ---------- Service engineers ----------
  {
    name: 'installation_assignment',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'New installation assigned:\n\nOrder: {{1}}\nCustomer: {{2}}\nAddress: {{3}}\nDate: {{4}}\n\nPlease log in to accept.',
        example: { body_text: [['PO-00001', 'Ramesh Patel', '12 Nehru Nagar, Coimbatore', '2026-08-01']] }
      }
    ]
  },
  {
    name: 'installation_scheduled',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is to inform you that an installation has been scheduled for the following customer in the system.\n\nCustomer name: {{2}}\nScheduled date: {{3}}\nOrder number: {{4}}\n\nKindly make the necessary arrangements and be ready for the visit.',
        example: { body_text: [['Service Engineer', 'Ramesh Kumar', '2026-08-02', 'PO-00002']] }
      }
    ]
  },
  {
    name: 'installation_reminder',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is a friendly reminder about the installation that is coming up for the customer mentioned below.\n\nCustomer name: {{2}}\nCustomer phone: {{3}}\nScheduled date: {{4}}\nOrder number: {{5}}\n\nPlease keep them informed and confirm the final schedule.',
        example: { body_text: [['Service Engineer', 'Suresh Kumar', '9876543210', '2026-08-03', 'PO-00003']] }
      }
    ]
  },
  {
    name: 'urgent_customer_contact',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is an urgent request to contact the customer mentioned below regarding the note that has been shared.\n\nCustomer name: {{2}}\nCustomer phone: {{3}}\nNote: {{4}}\nOrder number: {{5}}\n\nPlease get in touch with them at the earliest possible time and report back.',
        example: { body_text: [['Service Engineer', 'Anil Kumar', '9876543210', 'Customer reported installation issue', 'PO-00004']] }
      }
    ]
  }
];

async function listExisting() {
  console.log('\nExisting templates in library:');
  const templates = await getWhatsAppTemplates();
  if (templates.length === 0) {
    console.log('  (none found, or WABA_ID/token not configured)');
    return [];
  }
  templates.forEach((t) => {
    console.log(`  • ${t.name} [${t.status}] (${t.language})`);
  });
  return templates.map((t) => t.name);
}

async function createOne(tpl) {
  try {
    const result = await createWhatsAppTemplate(tpl);
    console.log(`✅ ${tpl.name}: submitted (${result.status})`);
    return result;
  } catch (error) {
    console.error(`❌ ${tpl.name}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

async function run() {
  const targetName = process.argv[2];

  if (targetName === '--list' || targetName === '-l') {
    await listExisting();
    return;
  }

  const existing = await listExisting();
  const targets = targetName
    ? TEMPLATES.filter((t) => t.name === targetName)
    : TEMPLATES;

  if (targetName && targets.length === 0) {
    console.error(`\n❌ Unknown template name: ${targetName}`);
    process.exit(1);
  }

  console.log(`\n🚀 Creating ${targets.length} WhatsApp template(s)...\n`);

  for (const template of targets) {
    if (existing.includes(template.name)) {
      console.log(`⏭️   ${template.name}: already exists (skipped)`);
      continue;
    }
    await createOne(template);
  }

  console.log('\n📚 Templates after creation:');
  await listExisting();
  console.log('\nNote: creation requires business verification + approval (MARKETING) may take time.');
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});