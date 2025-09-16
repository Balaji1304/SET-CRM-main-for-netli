const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');
const cloudinary = require('../config/cloudinary');
const NotificationService = require('../utils/notificationService');

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { title, description, category, relatedPurchaseId } = req.body;
    if (!title || !description || !category) throw new AppError('Title, description and category are required', 400);
    
    // Priority is always set to 'medium' by default for customer-created tickets
    // Only product heads can change priority later
    const ticketData = {
      user: req.user.id,
      title,
      description,
      category,
      priority: 'medium', // Default priority, only product head can change this
      relatedPurchaseId: relatedPurchaseId || undefined,
      attachments: []
    };

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'tickets',
            resource_type: 'auto'
          });
          
          ticketData.attachments.push({
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
            fileSize: file.size,
            publicId: result.public_id,
            uploadedBy: req.user.id
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          // Continue with ticket creation even if some files fail
        }
      }
    }
    
    const ticket = await Ticket.create(ticketData);
    
    // Populate user info for response
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('attachments.uploadedBy', 'name email');
    
    // Create notification for new ticket
    try {
      await NotificationService.createTicketNotification('ticket_created', populatedTicket);
    } catch (notificationError) {
      console.error('Failed to create ticket notification:', notificationError);
      // Continue without failing the ticket creation
    }
    
    res.status(201).json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
exports.updateTicket = async (req, res) => {
  try {
    let ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
    if (!ticket) throw new AppError('Ticket not found', 404);
    
    // Remove priority from update data if user is not front office executive
    const updateData = { ...req.body };
    if (req.user.role !== 'front_office_executive') {
      delete updateData.priority;
      delete updateData.assignedEngineerId;
      delete updateData.assignedBy;
      delete updateData.status; // Customers can't change status either
    }
    
    ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: ticket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
    if (!ticket) throw new AppError('Ticket not found', 404);
    await ticket.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Front Office Executive: list all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Front Office Executive: assign/unassign engineer
exports.assignTicket = async (req, res) => {
  try {
    const { engineerId } = req.body;
    const ticket = await Ticket.findById(req.params.id).populate('user', 'name email phone');
    if (!ticket) throw new AppError('Ticket not found', 404);
    
    const wasAssigned = ticket.assignedEngineerId;
    
    // Prevent unassigning if ticket already has an engineer assigned
    if (!engineerId && wasAssigned) {
      throw new AppError('Engineer assignment cannot be reverted once assigned', 400);
    }
    
    if (engineerId) {
      ticket.assignedEngineerId = engineerId;
      ticket.assignedBy = req.user.id;
      if (['open', 'reopened'].includes(ticket.status)) ticket.status = 'assigned';
    }
    
    await ticket.save();
    
    // Create notification for assignment
    if (engineerId && !wasAssigned) {
      try {
        await NotificationService.createTicketNotification('ticket_assigned', ticket, req.user);
      } catch (notificationError) {
        console.error('Failed to create assignment notification:', notificationError);
      }
    }
    
    // Populate and return the complete ticket data
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    res.json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Product Head: update ticket meta and reopen/close
exports.updateTicketMeta = async (req, res) => {
  try {
    const { priority, category, action } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (priority && ['low', 'medium', 'high'].includes(priority)) ticket.priority = priority;
    if (category) ticket.category = String(category);
    if (action === 'close') ticket.status = 'closed';
    if (action === 'reopen' && ['resolved', 'closed'].includes(ticket.status)) ticket.status = 'reopened';
    await ticket.save();
    
    // Populate and return the complete ticket data
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    res.json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Service Engineer: list assigned tickets
exports.getAssignedTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedEngineerId: req.user.id })
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Service Engineer: update status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['in_progress', 'awaiting_customer', 'resolved'];
    if (!allowed.includes(status)) throw new AppError('Invalid status update', 400);
    const ticket = await Ticket.findOne({ _id: req.params.id, assignedEngineerId: req.user.id });
    if (!ticket) throw new AppError('Ticket not found or not assigned to you', 404);
    const order = ['open', 'assigned', 'in_progress', 'awaiting_customer', 'resolved', 'closed'];
    if (order.indexOf(status) < order.indexOf(ticket.status)) throw new AppError('Cannot move ticket to an earlier state', 400);
    ticket.status = status;
    await ticket.save();
    
    // Populate and return the complete ticket data
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    res.json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Service Engineer: add comment
exports.addComment = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) throw new AppError('Message is required', 400);
    const ticket = await Ticket.findOne({ _id: req.params.id, assignedEngineerId: req.user.id });
    if (!ticket) throw new AppError('Ticket not found or not assigned to you', 404);
    ticket.comments.push({ author: req.user.id, message });
    await ticket.save();
    
    // Populate and return the complete ticket data
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    res.status(201).json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Service Engineer: upload attachment
exports.uploadAttachment = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, assignedEngineerId: req.user.id });
    if (!ticket) throw new AppError('Ticket not found or not assigned to you', 404);
    if (!req.file) throw new AppError('File is required', 400);

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'tickets',
      resource_type: 'auto'
    });

    ticket.attachments.push({
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      publicId: uploadResult.public_id,
      uploadedBy: req.user.id
    });

    await ticket.save();
    
    // Populate and return the complete ticket data
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email phone')
      .populate('assignedEngineerId', 'name email')
      .populate('comments.author', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    res.status(201).json({ success: true, data: populatedTicket });
  } catch (error) {
    errorHandler(res, error);
  }
}; 