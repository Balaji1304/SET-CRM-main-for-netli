import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, SortAsc, SortDesc, Calendar, User, Tag, AlertTriangle, Clock, CheckCircle, XCircle, MoreVertical, Download, RefreshCw, Users, Zap } from 'lucide-react';
import { getAllTickets, assignTicket, updateTicketMeta } from '../../services/ticketService';
import { getServiceEngineers } from '../../services/taskService';
import TicketDetailModal from '../../components/TicketDetailModal';
import { useAuth } from '../../context/AuthContext';

const TicketQueuePage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, e] = await Promise.all([getAllTickets(), getServiceEngineers()]);
      setTickets(t.data || []);
      setEngineers(e.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
      if (window.showToast) {
        window.showToast(err.message || 'Failed to load tickets', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    if (window.showToast) {
      window.showToast('Data refreshed successfully', 'success');
    }
  };

  const onAssign = async (id, engineerId) => {
    try {
      await assignTicket(id, engineerId || undefined);
      setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, assignedEngineerId: engineerId ? engineers.find(e=>e._id===engineerId) || { _id: engineerId } : undefined, status: engineerId ? 'assigned' : t.status } : t)));
      if (window.showToast) {
        window.showToast(engineerId ? 'Engineer assigned successfully' : 'Engineer unassigned', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to assign');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to assign', 'error');
      }
    }
  };

  const onUpdateMeta = async (id, payload) => {
    try {
      await updateTicketMeta(id, payload);
      setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, ...payload } : t)));
      if (window.showToast) {
        window.showToast('Ticket updated successfully', 'success');
      }
    } catch (e) {
      setError(e.message || 'Failed to update');
      if (window.showToast) {
        window.showToast(e.message || 'Failed to update', 'error');
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

  const handleBulkSelect = (ticketId) => {
    setBulkSelected(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleBulkAction = async (action, value) => {
    try {
      await Promise.all(bulkSelected.map(id => {
        if (action === 'assign') {
          return assignTicket(id, value);
        } else if (action === 'priority') {
          return updateTicketMeta(id, { priority: value });
        }
        return Promise.resolve();
      }));
      
      // Update local state
      setTickets(prev => prev.map(t => {
        if (bulkSelected.includes(t._id)) {
          if (action === 'assign') {
            return { ...t, assignedEngineerId: value ? engineers.find(e => e._id === value) : undefined, status: value ? 'assigned' : t.status };
          } else if (action === 'priority') {
            return { ...t, priority: value };
          }
        }
        return t;
      }));
      
      setBulkSelected([]);
      setShowBulkActions(false);
      if (window.showToast) {
        window.showToast(`Bulk ${action} completed successfully`, 'success');
      }
    } catch (e) {
      if (window.showToast) {
        window.showToast(`Bulk ${action} failed: ${e.message}`, 'error');
      }
    }
  };

  // Advanced filtering and sorting
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assignedEngineerId);
      } else {
        filtered = filtered.filter(ticket => ticket.assignedEngineerId?._id === assigneeFilter);
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        switch (dateFilter) {
          case 'today':
            return ticketDate >= today;
          case 'yesterday':
            return ticketDate >= yesterday && ticketDate < today;
          case 'week':
            return ticketDate >= weekAgo;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'assignee':
          aValue = a.assignedEngineerId?.name || 'zzzz'; // Unassigned goes to end
          bValue = b.assignedEngineerId?.name || 'zzzz';
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tickets, searchTerm, statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-orange-100 text-orange-800 border-orange-200',
      assigned: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      awaiting_customer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      reopened: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
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
        return null;
    }
  };

  const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

  const exportTickets = () => {
    const csvContent = [
      ['Title', 'Status', 'Priority', 'Category', 'Customer', 'Assignee', 'Created'],
      ...filteredAndSortedTickets.map(t => [
        t.title,
        t.status,
        t.priority,
        t.category,
        t.user?.name || '',
        t.assignedEngineerId?.name || 'Unassigned',
        new Date(t.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (window.showToast) {
      window.showToast('Tickets exported successfully', 'success');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ticket Queue</h2>
          <p className="text-muted-foreground mt-1">
            Manage {filteredAndSortedTickets.length} of {tickets.length} tickets
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {bulkSelected.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <span className="text-sm text-blue-800 font-medium">{bulkSelected.length} selected</span>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                Actions
              </button>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportTickets}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export tickets"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </div>
      
      {showBulkActions && bulkSelected.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-800">Bulk Actions:</span>
            <select
              onChange={(e) => {
                const [action, value] = e.target.value.split(':');
                if (action && value) handleBulkAction(action, value);
              }}
              className="px-3 py-1 border border-blue-300 rounded text-sm"
            >
              <option value="">Select action...</option>
              <option value="priority:high">Set High Priority</option>
              <option value="priority:medium">Set Medium Priority</option>
              <option value="priority:low">Set Low Priority</option>
              {engineers.map(eng => (
                <option key={eng._id} value={`assign:${eng._id}`}>Assign to {eng.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setBulkSelected([]);
                setShowBulkActions(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="px-4 py-3 bg-red-50 border-l-4 border-red-400 text-red-700">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Enhanced Search and Filter Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col space-y-4">
            {/* Search and Quick Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search tickets, customers, categories..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                    showFilters ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">Filters</span>
                  {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all') && (
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {[statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter].filter(f => f !== 'all').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="awaiting_customer">Awaiting Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="reopened">Reopened</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Engineers</option>
                    <option value="unassigned">Unassigned</option>
                    {engineers.map(eng => (
                      <option key={eng._id} value={eng._id}>{eng.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">This Week</option>
                  </select>
                </div>

                <div className="col-span-full flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    {filteredAndSortedTickets.length} tickets match your filters
                  </span>
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setAssigneeFilter('all');
                      setCategoryFilter('all');
                      setDateFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-orange-500 border-b border-input sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-medium text-white">
                  <input
                    type="checkbox"
                    checked={bulkSelected.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSelected(filteredAndSortedTickets.map(t => t._id));
                      } else {
                        setBulkSelected([]);
                      }
                    }}
                    className="rounded border-white"
                  />
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[280px]">
                  <button 
                    onClick={() => handleSort('title')}
                    className="flex items-center space-x-1 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                  >
                    <span>Ticket Details</span>
                    {getSortIcon('title')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[180px]">Customer</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[120px]">
                  <button 
                    onClick={() => handleSort('priority')}
                    className="flex items-center space-x-1 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                  >
                    <span>Priority</span>
                    {getSortIcon('priority')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[140px]">Category</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[200px]">
                  <button 
                    onClick={() => handleSort('assignee')}
                    className="flex items-center space-x-1 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                  >
                    <span>Assignment</span>
                    {getSortIcon('assignee')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-white min-w-[120px]">
                  <button 
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center space-x-1 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                  >
                    <span>Created</span>
                    {getSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-4 py-4 text-right text-sm font-medium text-white min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input">
              {loading ? (
                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={9}>Loading tickets...</td></tr>
              ) : filteredAndSortedTickets.length === 0 ? (
                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={9}>
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all' 
                    ? 'No tickets match your filters' 
                    : 'No tickets found'}
                </td></tr>
              ) : (
                filteredAndSortedTickets.map((t) => (
                  <tr key={t._id} className="hover:bg-orange-50/50 transition-colors cursor-pointer group border-b border-gray-100" onClick={() => handleTicketClick(t)}>
                    <td className="px-4 py-5 text-sm" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={bulkSelected.includes(t._id)}
                        onChange={() => handleBulkSelect(t._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-5 text-sm min-w-[280px]">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getPriorityIcon(t.priority)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate text-sm leading-5">{t.title}</div>
                          <div className="text-gray-500 text-xs truncate mt-1.5 max-w-xs">{t.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-sm min-w-[180px]">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-9 w-9 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 truncate text-sm font-medium">{t.user?.name || 'Unknown'}</div>
                          <div className="text-gray-500 text-xs truncate mt-0.5">{t.user?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(t.status)}`}>
                        {t.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={t.priority} 
                        onChange={(e)=>onUpdateMeta(t._id, { priority: e.target.value })}
                        className={`px-3 py-1.5 text-xs font-semibold rounded border ${getPriorityColor(t.priority)} focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[80px]`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <input 
                          value={t.category} 
                          onChange={(e)=>onUpdateMeta(t._id, { category: e.target.value })}
                          className="text-sm text-gray-500 border-none bg-transparent focus:bg-white focus:border focus:border-gray-300 focus:ring-2 focus:ring-orange-500 rounded px-2 py-1 flex-1 min-w-[100px]"
                          placeholder="Category"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-sm min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-3">
                        {t.assignedEngineerId ? (
                          <div className="flex items-center space-x-2">
                            <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-700 font-medium">{t.assignedEngineerId.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                        <select 
                          value={t.assignedEngineerId?._id || t.assignedEngineerId || ''} 
                          onChange={(e)=>onAssign(t._id, e.target.value || undefined)}
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[100px]"
                        >
                          <option value="">Unassigned</option>
                          {engineers.map((eng) => (
                            <option key={eng._id} value={eng._id}>{eng.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-right min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleTicketClick(t)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="View details"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          {t.status !== 'closed' && (
                            <button 
                              onClick={() => onUpdateMeta(t._id, {action: 'close'})}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                              title="Close ticket"
                            >
                              Close
                            </button>
                          )}
                          {t.status === 'closed' && (
                            <button 
                              onClick={() => onUpdateMeta(t._id, {action: 'reopen'})}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              title="Reopen ticket"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
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

export default TicketQueuePage;


