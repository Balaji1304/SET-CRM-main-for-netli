const mongoose = require('mongoose');

const WhatsAppMessageSchema = new mongoose.Schema({
  wamid: { type: String, index: true, sparse: true },
  direction: { type: String, enum: ['outbound', 'inbound'], required: true },
  to: { type: String, required: true, index: true },
  from: { type: String },
  type: { type: String, enum: ['template', 'text', 'document', 'image', 'video', 'audio', 'interactive', 'reaction'], required: true },
  templateName: { type: String, index: true },
  status: { type: String, enum: ['queued', 'sent', 'delivered', 'read', 'failed'], default: 'queued' },
  statusTimestamps: {
    sent: Date,
    delivered: Date,
    read: Date,
    failed: Date
  },
  error: {
    code: Number,
    title: String,
    message: String
  },
  pricing: {
    model: String,
    category: String
  },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  context: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

WhatsAppMessageSchema.index({ createdAt: -1 });
WhatsAppMessageSchema.index({ status: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);
