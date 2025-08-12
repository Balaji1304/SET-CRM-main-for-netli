import React, { useEffect, useState } from 'react';
import { Search, Filter, Eye, MessageCircle, Clock, User, Tag, AlertTriangle } from 'lucide-react';
import { getAssignedTickets, updateTicketStatus, addComment } from '../../services/ticketService';
import TicketDetailModal from '../../components/TicketDetailModal';
import { useAuth } from '../../context/AuthContext';

const CasesPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAssignedTickets();
        setTickets(res.data || []);
        setFilteredTickets(res.data || []);
      } catch (e) {
        setError(e.message || 'Failed to load cases');
        if (window.showToast) {
          window.showToast(e.message || 'Failed to load cases', 'error');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter tickets based on search and filters
  useEffect(() => {
    let filtered = tickets;

    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const onStatusChange = async (id, status) => {
    try {
      await updateTicketStatus(id, status);
      setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
      if (window.showToast) {
        window.showToast('Status updated successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to update status');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to update status', 'error');
      }
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    if (window.showToast) {
      window.showToast('Ticket updated successfully', 'success');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      awaiting_customer: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800'
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

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assigned Cases</h2>
          <p className="text-muted-foreground mt-1">Work on tickets assigned by Product Head</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
            <span>Assigned: {tickets.filter(t => t.status === 'assigned').length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
            <span>In Progress: {tickets.filter(t => t.status === 'in_progress').length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-100 rounded-full"></div>
            <span>Resolved: {tickets.filter(t => t.status === 'resolved').length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        {error && <div className="px-4 py-2 text-red-600 text-sm">{error}</div>}
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search cases..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              />
            </div>
            <select 
              className="border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              value={statusFilter} 
              onChange={(e)=>setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_customer">Awaiting Customer</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-600">
              Showing {filteredTickets.length} of {tickets.length} cases
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Case</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">Customer</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input">
              {loading ? (
                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>Loading...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>No cases found</td></tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t._id} className="hover:bg-orange-50/50 transition-colors cursor-pointer" onClick={() => handleTicketClick(t)}>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          t.priority === 'high' ? 'bg-red-400' :
                          t.priority === 'medium' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-900">{t.title}</div>
                          <div className="text-gray-500 text-xs truncate max-w-xs">{t.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(t.status)}`}>
                        {t.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(t.priority)}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Tag className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">{t.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">{t.user?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {t.status === 'assigned' && (
                          <button 
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors" 
                            onClick={() => onStatusChange(t._id, 'in_progress')}
                          >
                            Start
                          </button>
                        )}
                        {t.status === 'in_progress' && (
                          <>
                            <button 
                              className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors" 
                              onClick={() => onStatusChange(t._id, 'awaiting_customer')}
                            >
                              Wait
                            </button>
                            <button 
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors" 
                              onClick={() => onStatusChange(t._id, 'resolved')}
                            >
                              Resolve
                            </button>
                          </>
                        )}
                        {t.status === 'awaiting_customer' && (
                          <button 
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors" 
                            onClick={() => onStatusChange(t._id, 'resolved')}
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleTicketClick(t)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Eye className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userRole={user?.role}
        onUpdate={handleTicketUpdate}
      />
    </div>
  );
};

export default CasesPage;


