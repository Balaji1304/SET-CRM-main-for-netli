import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, Send, RefreshCw, Filter, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/apiConfig';

const StatusBadge = ({ status }) => {
  const colors = {
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    queued: 'bg-yellow-100 text-yellow-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  </div>
);

export default function WhatsAppPage() {
  const [tab, setTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgPage, setMsgPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDirection, setFilterDirection] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiRequest('/whatsapp/status');
      setStatus(res.data);
    } catch { setStatus(null); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiRequest('/whatsapp/templates');
      setTemplates(res.data || []);
    } catch { setTemplates([]); }
  }, []);

  const fetchMessages = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.set('status', filterStatus);
      if (filterDirection) params.set('direction', filterDirection);
      const res = await apiRequest(`/whatsapp/messages?${params}`);
      setMessages(res.data || []);
      setMsgTotal(res.total || 0);
      setMsgPage(res.page || 1);
    } catch { setMessages([]); }
  }, [filterStatus, filterDirection]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiRequest('/whatsapp/messages/stats?days=7');
      setStats(res.data);
    } catch { setStats(null); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStatus(), fetchTemplates(), fetchStats(), fetchMessages()])
      .finally(() => setLoading(false));
  }, [fetchStatus, fetchTemplates, fetchStats, fetchMessages]);

  useEffect(() => { fetchMessages(1); }, [filterStatus, filterDirection, fetchMessages]);

  const statusCounts = stats?.byStatus?.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}) || {};
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-semibold">WhatsApp Integration</h1>
        </div>
        <button
          onClick={() => { fetchStatus(); fetchTemplates(); fetchStats(); fetchMessages(msgPage); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${status?.isConfigured ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {status?.isConfigured ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {status?.isConfigured ? 'WhatsApp Business API connected' : 'WhatsApp not configured'}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total (7d)" value={total} icon={MessageSquare} color="bg-blue-50 text-blue-600" />
        <StatCard label="Sent" value={statusCounts.sent || 0} icon={Send} color="bg-blue-50 text-blue-600" />
        <StatCard label="Delivered" value={statusCounts.delivered || 0} icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard label="Read" value={statusCounts.read || 0} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Failed" value={statusCounts.failed || 0} icon={AlertTriangle} color="bg-red-50 text-red-600" />
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-4">
        {['overview', 'templates', 'messages'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 ${tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Messages per day (last 7 days)</h2>
          <div className="bg-white rounded-lg border p-4">
            {stats?.byDay?.length > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {stats.byDay.map(d => {
                  const maxCount = Math.max(...stats.byDay.map(x => x.count));
                  const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{d.count}</span>
                      <div className="w-full bg-green-500 rounded-t" style={{ height: `${Math.max(height, 4)}%` }} />
                      <span className="text-xs text-gray-400">{d._id.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No messages in the last 7 days</p>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Language</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{t.name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{t.category}</td>
                  <td className="px-4 py-2 text-gray-500">{t.language}</td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No templates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
            <select
              value={filterDirection}
              onChange={e => setFilterDirection(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All directions</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
            <span className="text-sm text-gray-400 self-center ml-auto">{msgTotal} messages</span>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Direction</th>
                  <th className="text-left px-4 py-2 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Template</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m, i) => (
                  <tr key={m._id || i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs ${m.direction === 'inbound' ? 'text-blue-600' : 'text-gray-600'}`}>
                        {m.direction === 'inbound' ? '← In' : '→ Out'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{m.direction === 'outbound' ? m.to : m.from}</td>
                    <td className="px-4 py-2 text-gray-500">{m.type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{m.templateName || '-'}</td>
                    <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No messages found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {msgTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button
                disabled={msgPage <= 1}
                onClick={() => fetchMessages(msgPage - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="self-center text-sm text-gray-500">Page {msgPage}</span>
              <button
                disabled={msgPage * 20 >= msgTotal}
                onClick={() => fetchMessages(msgPage + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
