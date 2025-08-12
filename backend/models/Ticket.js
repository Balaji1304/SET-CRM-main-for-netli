const mongoose = require('mongoose');


const TicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  relatedPurchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPurchase',
    required: false
  },

  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'awaiting_customer', 'resolved', 'closed', 'reopened'],
    default: 'open'
  },
  category: {
    type: String,
    required: [true, 'Please add a category']
  },

  assignedEngineerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  slaDueAt: { type: Date },

  comments: [
    {
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      message: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      attachments: [
        {
          url: String,
          publicId: String,
          type: { type: String, enum: ['image', 'pdf', 'other'], default: 'other' }
        }
      ]
    }
  ],

  attachments: [
    {
      url: String,
      publicId: String,
      type: { type: String, enum: ['image', 'pdf', 'other'], default: 'other' }
    }
  ]

}, {
  timestamps: true
});

TicketSchema.index({ assignedEngineerId: 1, status: 1 });
TicketSchema.index({ user: 1, status: 1 });


module.exports = mongoose.model('Ticket', TicketSchema); 

