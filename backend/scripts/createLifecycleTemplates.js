#!/usr/bin/env node
/**
 * Creates customer lifecycle WhatsApp templates on the WABA.
 * Run: node scripts/createLifecycleTemplates.js [--dry-run]
 */
require('dotenv').config();

// Force real mode for template creation
process.env.WHATSAPP_DEV_MODE = 'false';
delete require.cache[require.resolve('../config/whatsapp')];

const { createWhatsAppTemplate } = require('../utils/sendWhatsApp');

const dryRun = process.argv.includes('--dry-run');

const templates = [
  {
    name: 'ticket_created',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, your support ticket #{{2}} has been created. Our team will get back to you shortly.',
      example: { body_text: [['Customer', 'TKT-001']] }
    }]
  },
  {
    name: 'ticket_updated',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, your ticket #{{2}} has been updated. Status: {{3}}. {{4}}',
      example: { body_text: [['Customer', 'TKT-001', 'In Progress', 'An engineer has been assigned.']] }
    }]
  },
  {
    name: 'ticket_resolved',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, your ticket #{{2}} has been resolved. If you need further help, please contact us.',
      example: { body_text: [['Customer', 'TKT-001']] }
    }]
  },
  {
    name: 'order_tracking_update',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, your order {{2}} status update: {{3}}. Expected delivery: {{4}}.',
      example: { body_text: [['Customer', 'ORD-001', 'Shipped', '2026-12-20']] }
    }]
  },
  {
    name: 'payment_receipt',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, we received your payment of ₹{{2}} for {{3}}. Transaction ref: {{4}}. Thank you!',
      example: { body_text: [['Customer', '50,000', 'Quotation QT-001', 'TXN-12345']] }
    }]
  },
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, a friendly reminder that ₹{{2}} is due for {{3}} by {{4}}. Please make the payment at your earliest convenience.',
      example: { body_text: [['Customer', '50,000', 'Invoice INV-001', '2026-12-15']] }
    }]
  },
  {
    name: 'installation_completed',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: 'Hello {{1}}, your installation for order {{2}} has been completed. Please check everything and let us know if you have questions.',
      example: { body_text: [['Customer', 'ORD-001']] }
    }]
  }
];

(async () => {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Creating ${templates.length} lifecycle templates...\n`);

  for (const t of templates) {
    if (dryRun) {
      console.log(`  Would create: ${t.name} (${t.category})`);
      continue;
    }
    try {
      const result = await createWhatsAppTemplate(t);
      console.log(`  ✓ ${t.name}: ${result.status || 'submitted'} (id: ${result.id || 'pending'})`);
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message;
      if (msg.includes('already exists')) {
        console.log(`  – ${t.name}: already exists`);
      } else {
        console.error(`  ✗ ${t.name}: ${msg}`);
      }
    }
  }

  console.log('\nDone.');
  process.exit(0);
})();
