import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, Calendar, Loader2 } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, onExport, loading }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  if (!isOpen) return null;

  const setDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };
  
  const handleExportClick = () => {
    onExport({ startDate, endDate });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Export Data</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select a date range to export data. Leave blank to export all data.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDateRange(7)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full">Last 7 Days</button>
            <button onClick={() => setDateRange(30)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full">Last 30 Days</button>
            <button onClick={setThisMonth} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full">This Month</button>
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full">All Time</button>
          </div>
        </div>
        <div className="flex justify-end p-4 bg-gray-50 border-t">
          <button
            onClick={handleExportClick}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {loading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function ExportButton({ onExport, loading }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </button>
      <button
        onClick={() => setIsOpen(true)}
        className="sm:hidden p-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50"
        title="Export Data"
      >
        <Download className="h-5 w-5" />
      </button>
      <ExportModal isOpen={isOpen} onClose={() => setIsOpen(false)} onExport={onExport} loading={loading} />
    </>
  );
}

