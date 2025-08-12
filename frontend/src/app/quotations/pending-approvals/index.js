import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Check, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { getQuotations, approveQuotation, checkQuotationPaymentStatus } from '../../../services/quotationService';
import { API_URL } from '../../../services/apiConfig';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

export default function AccountsApprovalsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toApproveId, setToApproveId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [drawer, setDrawer] = useState({ open: false, row: null, checking: false, status: null, error: '' });
  // no offline payment form here; sales is responsible for recording it

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    if (!token) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = API_URL.replace(/^https?:\/\//, '').split('/api')[0];
    const ws = new WebSocket(`${wsProtocol}//${apiHost}?token=Bearer ${localStorage.getItem('token')}`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'QUOTATION_STATUS' && data.status === 'pending_approval') {
          fetchRows();
        }
      } catch (_) {}
    };
    return () => ws.close();
  }, [token]);

  const fetchRows = async (noCache = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await getQuotations(noCache);
      if (!res.success) throw new Error(res.message || 'Failed');
      const pending = (res.data || []).filter(q => q.status === 'pending_approval');
      setRows(pending);
    } catch (err) {
      setError(err.message || 'Error fetching approvals');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(r => (r.quotationNumber || '').toLowerCase().includes(q) || (r.lead?.email || '').toLowerCase().includes(q));
  }, [rows, query]);

  const openApprove = (id) => {
    setToApproveId(id);
    setShowConfirm(true);
  };

  const openDrawer = (row) => {
    setDrawer({ open: true, row, checking: false, status: null, error: '' });
  };
  const closeDrawer = () => setDrawer({ open: false, row: null, checking: false, status: null, error: '' });

  const checkStatus = async () => {
    if (!drawer.row) return;
    setDrawer(prev => ({ ...prev, checking: true, error: '' }));
    try {
      const res = await checkQuotationPaymentStatus(drawer.row._id);
      setDrawer(prev => ({ ...prev, checking: false, status: res.data }));
      if (res?.data?.paymentStatus === 'CONFIRMED') {
        fetchRows(true);
      }
    } catch (err) {
      setDrawer(prev => ({ ...prev, checking: false, error: err.message || 'Failed to check status' }));
    }
  };

  // Offline payment entry is handled by Sales

  const doApprove = async () => {
    setShowConfirm(false);
    if (!toApproveId) return;
    try {
      const target = rows.find(r => r._id === toApproveId);
      if (!target) throw new Error('Quotation not found');
      const res = await approveQuotation(toApproveId);
      if (!res.success) throw new Error(res.message || 'Approval failed');
      if (res.data && res.data.data && res.data.success === false) {
        throw new Error(res.data.message || 'Approval failed');
      }
      setToast({ show: true, msg: 'Quotation approved successfully', type: 'success' });
      fetchRows(true);
    } catch (err) {
      setToast({ show: true, msg: err.message || 'Approval error', type: 'error' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-fourth pb-5 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-secondary">Pending Approvals</h1>
      </div>
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 border-b border-fourth flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input className="pl-10 pr-4 py-2 w-full border border-fourth rounded-lg text-sm" placeholder="Search by # or email" value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(row => (
                  <tr key={row._id}>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{row.quotationNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.lead?.firstName} {row.lead?.lastName}<div className="text-xs text-gray-400">{row.lead?.email}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span className={row.advancePaymentStatus === 'CONFIRMED' ? 'text-green-600' : 'text-amber-600'}>
                          {row.advancePaymentStatus}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                        {row.advancePaymentAmount ? (
                          <div>Paid: ₹{Number(row.advancePaymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        ) : null}
                        <div>Method: {row.paymentMethod || 'N/A'}</div>
                        <div>Ref: {row.offlineTransactionNo || row.razorpayPaymentId || 'N/A'}</div>
                        <div>Date: {row.advancePaymentConfirmedAt ? new Date(row.advancePaymentConfirmedAt).toLocaleDateString('en-GB') : (row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('en-GB') : 'N/A')}</div>
                        {row.paymentNotes ? <div>Notes: {row.paymentNotes}</div> : null}
                        {(!row.offlineTransactionNo && row.advancePaymentStatus !== 'CONFIRMED') && (
                          <div className="text-amber-600">Missing reference number. Ask Sales to record offline payment.</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-y-1">
                      <button
                        onClick={() => openDrawer(row)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 mr-2"
                      >
                        View details
                      </button>
                      {/* No offline payment entry here; Sales records it */}
                      <button
                        onClick={() => openApprove(row._id)}
                        title={'Approve this quotation'}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Payment Details Drawer */}
        {drawer.open && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-secondary">Payment Details</h3>
                <button onClick={closeDrawer} className="px-3 py-1.5 text-sm rounded border">Close</button>
              </div>
              {drawer.row && (
                <div className="space-y-3 text-sm">
                  <div><span className="text-gray-500">Quotation #:</span> <span className="font-medium">{drawer.row.quotationNumber}</span></div>
                  <div><span className="text-gray-500">Lead:</span> <span className="font-medium">{drawer.row.lead?.firstName} {drawer.row.lead?.lastName}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span>{drawer.row.lead?.email}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span>₹{Number(drawer.row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="pt-2 border-t">
                    <div className="text-gray-500 mb-1">Payment entered by Sales</div>
                    <div>Amount: {drawer.row.advancePaymentAmount ? `₹${Number(drawer.row.advancePaymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</div>
                    <div>Method: {drawer.row.paymentMethod || 'N/A'}</div>
                    <div>Ref: {drawer.row.offlineTransactionNo || drawer.row.razorpayPaymentId || 'N/A'}</div>
                    <div>Date: {drawer.row.advancePaymentConfirmedAt ? new Date(drawer.row.advancePaymentConfirmedAt).toLocaleDateString('en-GB') : (drawer.row.paymentDate ? new Date(drawer.row.paymentDate).toLocaleDateString('en-GB') : 'N/A')}</div>
                    <div>Notes: {drawer.row.paymentNotes || 'N/A'}</div>
                    <div>Status: <span className={drawer.row.advancePaymentStatus === 'CONFIRMED' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{drawer.row.advancePaymentStatus}</span></div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="text-gray-500 mb-2">Live verification</div>
                    <button onClick={checkStatus} disabled={drawer.checking} className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-sm">
                      {drawer.checking ? 'Checking…' : 'Check live status'}
                    </button>
                    {drawer.status && (
                      <div className="mt-2 text-sm">
                        <div>Payment Status: <span className={drawer.status?.paymentStatus === 'CONFIRMED' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{drawer.status?.paymentStatus}</span></div>
                        <div>Quotation Status: {drawer.status?.quotationStatus}</div>
                        {drawer.status?.paymentId && <div>Payment ID: {drawer.status?.paymentId}</div>}
                      </div>
                    )}
                    {drawer.error && <div className="mt-2 text-red-600 text-sm">{drawer.error}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* No offline payment modal in Accounts */}
      </div>
      <ConfirmDialog isOpen={showConfirm} onClose={()=>setShowConfirm(false)} onConfirm={doApprove} title="Confirm Approval" message="Are you sure you want to approve this quotation?" />
      {toast.show && (
        <Toast message={toast.msg} type={toast.type === 'error' ? 'error' : 'success'} onClose={()=>setToast({show:false,msg:'',type:'success'})} />
      )}
    </div>
  );
}


