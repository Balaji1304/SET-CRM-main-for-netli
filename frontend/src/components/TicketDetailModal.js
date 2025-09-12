import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Clock, User, Tag, AlertTriangle, MessageCircle, Paperclip, Send, Upload, Eye, Download, 
  Edit3, Save, FileText, Calendar, Phone, Mail, MapPin, Building2, Users, 
  CheckCircle, XCircle, RotateCcw, Zap, Lock
} from 'lucide-react';
import { updateTicketStatus, addComment, updateTicketMeta, assignTicket } from '../services/ticketService';
import { getServiceEngineers } from '../services/taskService';

const TicketDetailModal = ({ ticket, isOpen, onClose, userRole, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newComment, setNewComment] = useState('');
  const [engineers, setEngineers] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [editData, setEditData] = useState({
    priority: ticket?.priority || 'medium',
    category: ticket?.category || '',
    assignedEngineerId: ticket?.assignedEngineerId?._id || ''
  });

  useEffect(() => {
    if (isOpen && userRole === 'product_head') {
      loadEngineers();
    }
    if (ticket) {
      setEditData({
        priority: ticket.priority || 'medium',
        category: ticket.category || '',
        assignedEngineerId: ticket.assignedEngineerId?._id || ''
      });
    }
  }, [isOpen, ticket, userRole]);

  const loadEngineers = async () => {
    try {
      const res = await getServiceEngineers();
      setEngineers(res.data || []);
    } catch (e) {
      console.error('Failed to load engineers:', e);
    }
  };

  const handleStatusUpdate = async (status) => {
    setLoading(true);
    try {
      const response = await updateTicketStatus(ticket._id, status);
      setSuccess('Status updated successfully');
      const updatedTicket = response.data;
      // Update the ticket in parent component with complete data
      onUpdate(updatedTicket);
      // Update local ticket state if needed
      if (ticket._id === updatedTicket._id) {
        // Update the selected ticket if it's the same one
        setEditData({
          priority: updatedTicket.priority || 'medium',
          category: updatedTicket.category || '',
          assignedEngineerId: updatedTicket.assignedEngineerId?._id || ''
        });
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to update status');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const response = await addComment(ticket._id, newComment);
      setSuccess('Comment added successfully');
      setNewComment('');
      const updatedTicket = response.data;
      // Update the ticket in parent component with complete data
      onUpdate(updatedTicket);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to add comment');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setUploadPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setUploadPreview(null);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await fetch(`/api/tickets/engineer/${ticket._id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      setSuccess('File uploaded successfully');
      setUploadFile(null);
      setUploadPreview(null);
      // Reset file input
      document.getElementById('file-input').value = '';
      
      // Update the ticket with the new attachment data
      if (result.data) {
        onUpdate(result.data);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to upload file');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      if (userRole === 'product_head') {
        // Handle assignment separately if changed
        if (editData.assignedEngineerId !== (ticket.assignedEngineerId?._id || '')) {
          const assignResponse = await assignTicket(ticket._id, editData.assignedEngineerId || undefined);
          // Update with assignment data
          onUpdate(assignResponse.data);
        }
        
        // Handle meta updates (priority, category)
        const metaResponse = await updateTicketMeta(ticket._id, {
          priority: editData.priority,
          category: editData.category
        });
        
        setSuccess('Ticket updated successfully');
        // Update the ticket in parent component with complete data
        onUpdate(metaResponse.data);
        
        // Update local edit data
        setEditData({
          priority: metaResponse.data.priority || 'medium',
          category: metaResponse.data.category || '',
          assignedEngineerId: metaResponse.data.assignedEngineerId?._id || ''
        });
      }
      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to update ticket');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleMetaAction = async (action) => {
    setLoading(true);
    try {
      const response = await updateTicketMeta(ticket._id, { action });
      setSuccess(`Ticket ${action}d successfully`);
      const updatedTicket = response.data;
      // Update the ticket in parent component with complete data
      onUpdate(updatedTicket);
      // Update local edit data
      setEditData({
        priority: updatedTicket.priority || 'medium',
        category: updatedTicket.category || '',
        assignedEngineerId: updatedTicket.assignedEngineerId?._id || ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || `Failed to ${action} ticket`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-orange-50 text-orange-800 border-orange-200',
      assigned: 'bg-blue-50 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-50 text-purple-800 border-purple-200',
      awaiting_customer: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-50 text-green-800 border-green-200',
      closed: 'bg-gray-50 text-gray-800 border-gray-200',
      reopened: 'bg-red-50 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-50 text-red-800 border-red-200',
      medium: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      low: 'bg-green-50 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatEnumValue = (value) => {
    if (!value) return '';
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-1 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-6xl sm:max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Mobile-optimized Header */}
        <div className="flex flex-col border-b border-gray-200 bg-gradient-to-r from-[#FF7300]/5 to-orange-50">
          {/* Top row with title and close button */}
          <div className="flex items-start justify-between p-3 sm:p-6">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
              <div className="flex-shrink-0 mt-0.5">
                {getPriorityIcon(ticket.priority)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 leading-tight break-words">
                  {ticket.title}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">#{ticket._id?.slice(-8)}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/80 rounded-lg transition-all duration-200 hover:shadow-md border border-gray-200 hover:border-gray-300"
              title="Close modal"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {/* Mobile badges row */}
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3 sm:px-6 sm:pb-4">
            <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
              {formatEnumValue(ticket.status)}
            </span>
            <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.toUpperCase()} PRIORITY
            </span>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="p-3 sm:p-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Mobile-first Layout */}
        <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(95vh-140px)] lg:flex-row">
          {/* Mobile Actions Bar - Sticky at top on mobile */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-3">
            {(userRole === 'service_engineer' || userRole === 'product_head') && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {/* Status Actions for Service Engineers */}
                {userRole === 'service_engineer' && (
                  <>
                    {[
                      { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'purple' },
                      { value: 'awaiting_customer', label: 'Awaiting', icon: User, color: 'yellow' },
                      { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' }
                    ].map((status) => {
                      const Icon = status.icon;
                      return (
                        <button
                          key={status.value}
                          onClick={() => handleStatusUpdate(status.value)}
                          disabled={loading || ticket.status === status.value}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            ticket.status === status.value 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm active:scale-95'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="whitespace-nowrap">{status.label}</span>
                        </button>
                      );
                    })}
                  </>
                )}
                
                {/* Product Head Edit/Save Actions */}
                {userRole === 'product_head' && (
                  <>
                    {editMode ? (
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#FF7300] text-white rounded-lg hover:bg-[#E6650E] disabled:opacity-50 text-xs font-medium transition-all duration-200 active:scale-95"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-all duration-200 active:scale-95"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-6">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Customer Information Card - Mobile Optimized */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-blue-100">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Customer Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600">Customer Name</p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{ticket.user?.name || 'Unknown Customer'}</p>
                      </div>
                    </div>
                    
                    {ticket.user?.phone && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600">Phone</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">{ticket.user.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {ticket.user?.email && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600">Email</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{ticket.user.email}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600">Created</p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{new Date(ticket.createdAt).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Section - Mobile Optimized */}
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    Description
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {ticket.description || 'No description provided'}
                    </p>
                  </div>
                </div>

              {/* Ticket Details Grid - Mobile Responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Category */}
                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Category
                  </label>
                  {editMode && userRole === 'product_head' ? (
                    <input
                      type="text"
                      value={editData.category}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm"
                      placeholder="Enter category"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-sm sm:text-base">{ticket.category || 'No category'}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                    <Zap className="h-4 w-4 text-gray-500" />
                    Priority Level
                  </label>
                  {editMode && userRole === 'product_head' ? (
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(ticket.priority)}
                      <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  )}
                </div>

                {/* Assignment - Full width on mobile */}
                {userRole === 'product_head' && (
                  <div className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                      <Users className="h-4 w-4 text-gray-500" />
                      Assigned Engineer
                    </label>
                    {editMode ? (
                      <select
                        value={editData.assignedEngineerId}
                        onChange={(e) => setEditData({ ...editData, assignedEngineerId: e.target.value })}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7300] focus:border-transparent text-sm"
                      >
                        <option value="">Select Engineer...</option>
                        {engineers.map((eng) => (
                          <option key={eng._id} value={eng._id}>{eng.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        {ticket.assignedEngineerId ? (
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm sm:text-base">{ticket.assignedEngineerId.name}</span>
                              <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" title="Assignment is permanent" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-sm sm:text-base">No engineer assigned</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section - Mobile Optimized */}
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  Activity & Comments
                  {ticket.comments && ticket.comments.length > 0 && (
                    <span className="text-xs sm:text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {ticket.comments.length}
                    </span>
                  )}
                </h2>
                
                {/* Comments List - Mobile Optimized */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 max-h-60 sm:max-h-80 overflow-y-auto">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    ticket.comments.map((comment, index) => (
                      <div key={index} className="flex gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-[#FF7300] to-orange-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs sm:text-sm font-semibold">
                              {comment.author?.name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {comment.author?.name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                              {new Date(comment.createdAt).toLocaleString('en-GB')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed break-words">{comment.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs text-gray-400 mt-1">Be the first to add a comment</p>
                    </div>
                  )}
                </div>

                {/* Add Comment - Service Engineer only - Mobile Optimized */}
                {userRole === 'service_engineer' && (
                  <div className="space-y-3 sm:space-y-4 border-t border-gray-200 pt-4 sm:pt-6">
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment or update..."
                          rows={3}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7300] focus:border-transparent resize-none text-sm placeholder-gray-400"
                        />
                        <div className="flex justify-end mt-2 sm:mt-3">
                          <button
                            onClick={handleAddComment}
                            disabled={loading || !newComment.trim()}
                            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-[#FF7300] text-white rounded-lg hover:bg-[#E6650E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm active:scale-95"
                          >
                            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm font-medium">Post Comment</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* File Upload Section - Mobile Optimized */}
                    <div className="border-t border-gray-100 pt-3 sm:pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        Attach Files
                      </h4>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                        <input
                          id="file-input"
                          type="file"
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                        />
                        <label
                          htmlFor="file-input"
                          className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm active:scale-95"
                        >
                          <Upload className="h-4 w-4 text-gray-600" />
                          <span className="text-gray-700">Choose File</span>
                        </label>
                        
                        {uploadFile && (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 w-full sm:w-auto">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate flex-1" title={uploadFile.name}>
                              {uploadFile.name}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={handleFileUpload}
                                disabled={loading}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition-colors active:scale-95"
                              >
                                Upload
                              </button>
                              <button
                                onClick={() => {
                                  setUploadFile(null);
                                  setUploadPreview(null);
                                  document.getElementById('file-input').value = '';
                                }}
                                className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 transition-colors active:scale-95"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* File Preview - Mobile Optimized */}
                      {uploadPreview && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2">Preview:</p>
                          <img 
                            src={uploadPreview} 
                            alt="Preview" 
                            className="max-w-full max-h-32 sm:max-h-48 object-contain rounded border border-gray-300 shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments Section - Mobile Optimized */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 shadow-sm">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    Attachments
                    <span className="text-xs sm:text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {ticket.attachments.length}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {ticket.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {attachment.type === 'image' ? 'Image File' : 
                             attachment.type === 'pdf' ? 'PDF Document' : 
                             'Document'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button 
                            className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-lg transition-colors group active:scale-95"
                            title="Preview"
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 group-hover:text-blue-600" />
                          </button>
                          <button 
                            className="p-1.5 sm:p-2 hover:bg-green-50 rounded-lg transition-colors group active:scale-95"
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 group-hover:text-green-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Desktop Sidebar - Hidden on Mobile */}
          <div className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 p-6">
            <div className="space-y-6">
              {/* Status Actions for Service Engineers */}
              {userRole === 'service_engineer' && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Update Status
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'in_progress', label: 'In Progress', color: 'purple' },
                      { value: 'awaiting_customer', label: 'Awaiting Customer', color: 'yellow' },
                      { value: 'resolved', label: 'Resolved', color: 'green' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusUpdate(status.value)}
                        disabled={loading || ticket.status === status.value}
                        className={`w-full px-4 py-3 text-left rounded-lg transition-all duration-200 text-sm font-medium ${
                          ticket.status === status.value 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                            : `bg-white border border-${status.color}-200 text-${status.color}-700 hover:bg-${status.color}-50 hover:border-${status.color}-300 shadow-sm hover:shadow-md`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {status.value === 'in_progress' && <Clock className="h-4 w-4" />}
                          {status.value === 'awaiting_customer' && <User className="h-4 w-4" />}
                          {status.value === 'resolved' && <CheckCircle className="h-4 w-4" />}
                          {status.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Head Actions */}
              {userRole === 'product_head' && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-blue-600" />
                    Management Actions
                  </h3>
                  <div className="space-y-3">
                    {editMode ? (
                      <div className="space-y-3">
                        <button
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FF7300] text-white rounded-lg hover:bg-[#E6650E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <Save className="h-4 w-4" />
                          <span className="font-medium">Save Changes</span>
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="font-medium">Edit Ticket</span>
                      </button>
                    )}
                    
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      {ticket.status !== 'closed' && (
                        <button
                          onClick={() => handleMetaAction('close')}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="font-medium">Close Ticket</span>
                        </button>
                      )}
                      {ticket.status === 'closed' && (
                        <button
                          onClick={() => handleMetaAction('reopen')}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="font-medium">Reopen Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Information */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Ticket Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{new Date(ticket.createdAt).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ticket ID</p>
                      <p className="text-sm text-gray-600 font-mono">#{ticket._id?.slice(-8)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Reporter</p>
                      <p className="text-sm text-gray-600">{ticket.user?.name || 'Unknown Customer'}</p>
                    </div>
                  </div>

                  {ticket.assignedEngineerId && (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Assigned Engineer</p>
                        <p className="text-sm text-gray-600">{ticket.assignedEngineerId.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current Status</p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                        {formatEnumValue(ticket.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TicketDetailModal;
