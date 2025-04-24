const mongoose = require('mongoose');


const TicketSchema = new mongoose.Schema({
  user: {

    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  category: {
    type: String,
    required: [true, 'Please add a category']
  }

}, {
  timestamps: true
});


module.exports = mongoose.model('Ticket', TicketSchema); 

