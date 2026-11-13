#!/usr/bin/env node
/**
 * Submits the Sunlit Solar Energy Pvt Ltd template set to the WABA for approval.
 * _v2 names replace the live templates once approved; the rest are new.
 * Every template keeps the placeholder order the send code already uses.
 * Run: node scripts/createProfessionalTemplates.js [--dry-run]
 */
require('dotenv').config();

process.env.WHATSAPP_DEV_MODE = 'false';
delete require.cache[require.resolve('../config/whatsapp')];

const { createWhatsAppTemplate } = require('../utils/sendWhatsApp');

const COMPANY = 'Sunlit Solar Energy Pvt Ltd';
const dryRun = process.argv.includes('--dry-run');

// [name, body, example values]
const TEMPLATES = [
  // Customer-facing replacements
  ['quotation_ready_v2',
    `Dear {{1}},\n\nYour quotation *{{2}}* from ${COMPANY} is ready. The detailed quotation has been sent to your registered email address.\n\nPlease review it and reply to this message if you have any questions or would like to proceed.\n\nRegards,\nCustomer Care Team`,
    ['Ravi Kumar', 'QT565279296']],
  ['invoice_generated_v2',
    `Dear {{1}},\n\nInvoice *{{2}}* for {{3}} has been issued by ${COMPANY}. Payment is due by {{4}}.\n\nFor any billing queries, please reply to this message.\n\nRegards,\nAccounts Team`,
    ['Ravi Kumar', 'INV-1024', '₹3,59,964', '15 Dec 2026']],
  ['account_created_v2',
    // Meta rejected a version mentioning login secrecy and order tracking as INCORRECT_CATEGORY
    `Dear {{1}},\n\nYour account with ${COMPANY} has been created successfully.\n\nUsername: {{2}}\nPortal link: {{3}}\n\nYou can log in to view your details and manage your account.\n\nRegards,\nCustomer Care Team`,
    ['Ravi Kumar', 'ravi@example.com', 'https://portal.example.com']],

  // Internal team replacements
  ['lead_assignment_v2',
    'Dear {{1}},\n\nA new lead has been assigned to you.\n\nName: {{2}}\nPhone: {{3}}\nEmail: {{4}}\nSource: {{5}}\nPriority: {{6}}\n\nPlease contact the lead within one business day and update the status in the CRM.',
    ['Anitha', 'Ravi Kumar', '9876543210', 'ravi@example.com', 'Exhibition', 'High']],
  ['follow_up_reminder_v2',
    'Dear {{1}},\n\nThis is a reminder to follow up with the lead below.\n\nName: {{2}}\nPhone: {{3}}\nLast contacted: {{4}} days ago\n\nPlease reach out today and record the outcome in the CRM.',
    ['Anitha', 'Ravi Kumar', '9876543210', '3']],
  ['quotation_pending_v2',
    'Dear {{1}},\n\nQuotation *{{2}}* is awaiting your approval.\n\nCustomer: {{3}}\nAmount: ₹{{4}}\nPending for: {{5}} days\n\nPlease review it in the CRM at the earliest.',
    ['Suresh', 'QT565279296', 'Ravi Kumar', '3,59,964', '2']],
  ['hot_lead_alert_v2',
    'Dear {{1}},\n\nA high-priority lead needs your immediate attention.\n\nName: {{2}}\nPhone: {{3}}\nReason: {{4}}\n\nPlease contact the lead as soon as possible and update the CRM.',
    ['Anitha', 'Ravi Kumar', '9876543210', 'Requested a site visit this week']],
  ['payment_received_v2',
    'Dear {{1}},\n\nA customer payment has been received.\n\nCustomer: {{2}}\nAmount: ₹{{3}}\nPayment method: {{4}}\nInvoice: {{5}}\n\nPlease reconcile this payment in the CRM.',
    ['Priya', 'Ravi Kumar', '50,000', 'UPI', 'INV-1024']],
  ['payment_pending_v2',
    'Dear {{1}},\n\nThe payment below is overdue and needs follow-up.\n\nCustomer: {{2}}\nAmount due: ₹{{3}}\nInvoice: {{4}}\nDays overdue: {{5}}\n\nPlease contact the customer and update the payment status in the CRM.',
    ['Priya', 'Ravi Kumar', '50,000', 'INV-1024', '5']],
  ['invoice_due_v2',
    'Dear {{1}},\n\nThe invoice below is due soon.\n\nCustomer: {{2}}\nAmount: ₹{{3}}\nInvoice: {{4}}\nDue date: {{5}}\nDays remaining: {{6}}\n\nPlease send a payment reminder to the customer before the due date.',
    ['Priya', 'Ravi Kumar', '50,000', 'INV-1024', '15 Dec 2026', '3']],
  ['installation_assignment_v2',
    'A new installation has been assigned to you.\n\nOrder: {{1}}\nCustomer: {{2}}\nAddress: {{3}}\nDate: {{4}}\n\nPlease log in to the CRM to accept the assignment.',
    ['ORD-2041', 'Ravi Kumar', '27 Dr. Jaganatha Nagar, Coimbatore', '18 Dec 2026']],
  ['installation_scheduled_v2',
    'Dear {{1}},\n\nAn installation has been scheduled.\n\nCustomer: {{2}}\nDate: {{3}}\nOrder: {{4}}\n\nPlease prepare the required equipment and confirm your availability in the CRM.',
    ['Karthik', 'Ravi Kumar', '18 Dec 2026', 'ORD-2041']],
  ['installation_reminder_v2',
    'Dear {{1}},\n\nReminder: you have an upcoming installation.\n\nCustomer: {{2}}\nPhone: {{3}}\nDate: {{4}}\nOrder: {{5}}\n\nPlease confirm the visit time with the customer in advance.',
    ['Karthik', 'Ravi Kumar', '9876543210', '18 Dec 2026', 'ORD-2041']],
  ['urgent_customer_contact_v2',
    'Dear {{1}},\n\nA customer has requested urgent contact.\n\nCustomer: {{2}}\nPhone: {{3}}\nNote: {{4}}\nOrder: {{5}}\n\nPlease call the customer as soon as possible and update the CRM after the call.',
    ['Karthik', 'Ravi Kumar', '9876543210', 'Inverter showing an error code', 'ORD-2041']],

  // New customer lifecycle templates
  ['ticket_created',
    `Dear {{1}},\n\nYour service request has been registered with ${COMPANY}. Your ticket number is *{{2}}*.\n\nOur support team will contact you shortly. Please quote this ticket number in all future communication.\n\nRegards,\nCustomer Support Team`,
    ['Ravi Kumar', 'TKT-1001']],
  ['ticket_updated',
    'Dear {{1}},\n\nThere is an update on your service ticket *{{2}}*.\n\nStatus: {{3}}\nDetails: {{4}}\n\nReply to this message if you need any further assistance.\n\nRegards,\nCustomer Support Team',
    ['Ravi Kumar', 'TKT-1001', 'In progress', 'A service engineer has been assigned']],
  ['ticket_resolved',
    'Dear {{1}},\n\nYour service ticket *{{2}}* has been resolved.\n\nIf the issue occurs again, reply to this message and our team will assist you.\n\nRegards,\nCustomer Support Team',
    ['Ravi Kumar', 'TKT-1001']],
  ['order_tracking_update',
    `Dear {{1}},\n\nHere is the latest update on your order *{{2}}* with ${COMPANY}.\n\nStatus: {{3}}\nExpected delivery: {{4}}\n\nWe will keep you informed of any further changes.\n\nRegards,\nCustomer Care Team`,
    ['Ravi Kumar', 'ORD-2041', 'Dispatched', '20 Dec 2026']],
  ['payment_receipt',
    'Dear {{1}},\n\nWe have received your payment of ₹{{2}} towards {{3}}.\n\nTransaction reference: {{4}}\n\nPlease keep this message for your records.\n\nRegards,\nAccounts Team',
    ['Ravi Kumar', '50,000', 'quotation QT565279296', 'pay_PQ12AB34CD']],
  ['payment_reminder',
    'Dear {{1}},\n\nThis is a reminder that a payment of ₹{{2}} towards {{3}} is due on {{4}}.\n\nIf you have already paid, please ignore this message. For any queries, reply to this message.\n\nRegards,\nAccounts Team',
    ['Ravi Kumar', '50,000', 'invoice INV-1024', '15 Dec 2026']],
  ['installation_completed',
    `Dear {{1}},\n\nThe installation for your order *{{2}}* has been completed by ${COMPANY}.\n\nPlease check the system and reply to this message if you have any questions.\n\nRegards,\nService Team`,
    ['Ravi Kumar', 'ORD-2041']],
  ['order_confirmation',
    `Dear {{1}},\n\nYour order *{{2}}* with ${COMPANY} has been confirmed.\n\nOrder value: ₹{{3}}\nAdvance paid: ₹{{4}}\n\nThe order form has been shared with you for your reference.\n\nRegards,\nCustomer Care Team`,
    ['Ravi Kumar', 'ORD-2041', '3,59,964', '71,993']]
];

const toPayload = ([name, text, example]) => {
  const placeholders = (text.match(/\{\{\d+\}\}/g) || []).length;
  if (placeholders !== example.length) throw new Error(`${name}: ${placeholders} placeholders but ${example.length} examples`);
  return {
    name,
    language: 'en_US',
    category: 'UTILITY',
    allowCategoryChange: false,
    components: [
      { type: 'BODY', text, example: { body_text: [example] } },
      { type: 'FOOTER', text: COMPANY }
    ]
  };
};

(async () => {
  const payloads = TEMPLATES.map(toPayload);
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Submitting ${payloads.length} templates...\n`);

  for (const t of payloads) {
    if (dryRun) {
      console.log(`  ${t.name}: ${t.components[0].example.body_text[0].length} placeholders`);
      continue;
    }
    try {
      const result = await createWhatsAppTemplate(t);
      console.log(`  ✓ ${t.name}: submitted (id: ${result.id || 'pending'})`);
    } catch (e) {
      const msg = e.response?.data?.error?.error_user_msg || e.response?.data?.error?.message || e.message;
      console.error(`  ✗ ${t.name}: ${msg}`);
    }
  }

  console.log('\nDone. Approval usually takes minutes to a few hours; check status with GET /api/whatsapp/templates.');
  process.exit(0);
})();
