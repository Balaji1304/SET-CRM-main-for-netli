import { useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Check, X } from 'lucide-react';
import { getQuotations } from '../../../services/quotationService';
import { apiRequest } from '../../../services/apiConfig';

export default function ApprovedPaymentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getQuotations(false, { status: 'approved' });
      if (!res.success) throw new Error(res.message || 'Failed to load');
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Error loading approved payments');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter(r => (r.quotationNumber || '').toLowerCase().includes(s) || (r.lead?.email || '').toLowerCase().includes(s));
  }, [rows, q]);

  const approveManual = async (purchaseId, paymentId) => {
    try {
      await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/verify`, { method: 'PUT' }, false);
      setActionMessage('Payment verified');
      fetchRows();
    } catch (e) { setActionMessage(e.message || 'Failed to verify'); }
  };
  const rejectManual = async (purchaseId, paymentId) => {
    try {
      await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/reject`, { method: 'PUT', body: { reason: 'Not matched' } }, false);
      setActionMessage('Payment rejected');
      fetchRows();
    } catch (e) { setActionMessage(e.message || 'Failed to reject'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-fourth pb-5 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-secondary">Approved Payments</h1>
      </div>
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 border-b border-fourth flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input className="pl-10 pr-4 py-2 w-full border border-fourth rounded-lg text-sm" placeholder="Search by # or email" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {actionMessage && (
            <div className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200">{actionMessage}</div>
          )}
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
                        <span className={'text-green-600'}>CONFIRMED</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                        {row.advancePaymentAmount ? (
                          <div>Paid: ₹{Number(row.advancePaymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        ) : null}
                        <div>Method: {row.paymentMethod || (row.razorpayPaymentId ? 'razorpay' : 'N/A')}</div>
                        <div>Ref: {row.offlineTransactionNo || row.razorpayPaymentId || 'N/A'}</div>
                        <div>Date: {row.advancePaymentConfirmedAt ? new Date(row.advancePaymentConfirmedAt).toLocaleDateString('en-GB') : (row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('en-GB') : 'N/A')}</div>
                      </div>
                      {row.customerPurchaseDetails && row.customerPurchaseDetails.paymentReviewStatus === 'pending_verification' && row.payments?.length ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white flex items-center gap-1" onClick={()=>approveManual(row.customerPurchaseDetails._id, row.payments[0]?._id)}><Check className="w-3 h-3"/>Verify</button>
                          <button className="px-3 py-1.5 text-xs rounded bg-red-600 text-white flex items-center gap-1" onClick={()=>rejectManual(row.customerPurchaseDetails._id, row.payments[0]?._id)}><X className="w-3 h-3"/>Reject</button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


