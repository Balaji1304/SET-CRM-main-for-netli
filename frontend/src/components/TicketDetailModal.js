import React, { useState, useEffect } from 'react';
import { X, Clock, User, Tag, AlertCircle, MessageCircle, Paperclip, Send, Upload, Eye, Download } from 'lucide-react';
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
      await updateTicketStatus(ticket._id, status);
      setSuccess('Status updated successfully');
      onUpdate({ ...ticket, status });
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
      await addComment(ticket._id, newComment);
      setSuccess('Comment added successfully');
      setNewComment('');
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
      
      setSuccess('File uploaded successfully');
      setUploadFile(null);
      setUploadPreview(null);
      // Reset file input
      document.getElementById('file-input').value = '';
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
        if (editData.assignedEngineerId !== (ticket.assignedEngineerId?._id || '')) {
          await assignTicket(ticket._id, editData.assignedEngineerId || undefined);
        }
        await updateTicketMeta(ticket._id, {
          priority: editData.priority,
          category: editData.category
        });
        setSuccess('Ticket updated successfully');
        onUpdate({
          ...ticket,
          priority: editData.priority,
          category: editData.category,
          assignedEngineerId: editData.assignedEngineerId ? 
            engineers.find(e => e._id === editData.assignedEngineerId) || { _id: editData.assignedEngineerId } 
            : undefined
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

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-orange-100 text-orange-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      awaiting_customer: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      reopened: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-orange-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">{ticket.title}</h2>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Ticket Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Ticket Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  {editMode && userRole === 'product_head' ? (
                    <input
                      type="text"
                      value={editData.category}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{ticket.category}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  {editMode && userRole === 'product_head' ? (
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-gray-900">{ticket.user?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                {userRole === 'product_head' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Engineer</label>
                    {editMode ? (
                      <select
                        value={editData.assignedEngineerId}
                        onChange={(e) => setEditData({ ...editData, assignedEngineerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Unassigned</option>
                        {engineers.map((eng) => (
                          <option key={eng._id} value={eng._id}>{eng.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">{ticket.assignedEngineerId?.name || 'Unassigned'}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Activity & Comments</h3>
                
                {/* Comments List */}
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    ticket.comments.map((comment, index) => (
                      <div key={index} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {comment.author?.name?.[0] || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {comment.author?.name || 'Unknown User'}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-1">{comment.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No comments yet</p>
                  )}
                </div>

                {/* Add Comment (Service Engineer only) */}
                {userRole === 'service_engineer' && (
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={loading || !newComment.trim()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                    </div>

                    {/* File Upload */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Upload Attachment</h4>
                      <div className="flex items-center space-x-4">
                        <input
                          id="file-input"
                          type="file"
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                        />
                        <label
                          htmlFor="file-input"
                          className="cursor-pointer flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-700">Choose File</span>
                        </label>
                        {uploadFile && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{uploadFile.name}</span>
                            <button
                              onClick={handleFileUpload}
                              disabled={loading}
                              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => {
                                setUploadFile(null);
                                setUploadPreview(null);
                                document.getElementById('file-input').value = '';
                              }}
                              className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* File Preview */}
                      {uploadPreview && (
                        <div className="mt-3">
                          <img 
                            src={uploadPreview} 
                            alt="Preview" 
                            className="max-w-xs max-h-32 object-contain border border-gray-200 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {ticket.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <Paperclip className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.type === 'image' ? 'Image' : attachment.type === 'pdf' ? 'PDF' : 'File'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Download className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
            <div className="space-y-6">
              {/* Status Actions */}
              {userRole === 'service_engineer' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Update Status</h3>
                  <div className="space-y-2">
                    {['in_progress', 'awaiting_customer', 'resolved'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={loading || ticket.status === status}
                        className={`w-full px-4 py-2 text-left rounded-lg transition-colors ${
                          ticket.status === status 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Head Actions */}
              {userRole === 'product_head' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-3">
                    {editMode ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Edit Ticket
                      </button>
                    )}
                    
                    <div className="border-t pt-3">
                      <button
                        onClick={() => updateTicketMeta(ticket._id, { action: 'close' })}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 mb-2"
                      >
                        Close Ticket
                      </button>
                      <button
                        onClick={() => updateTicketMeta(ticket._id, { action: 'reopen' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Reopen Ticket
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Reporter: {ticket.user?.name || 'Unknown'}</span>
                  </div>
                  {ticket.assignedEngineerId && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Assignee: {ticket.assignedEngineerId.name}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Priority: {ticket.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
