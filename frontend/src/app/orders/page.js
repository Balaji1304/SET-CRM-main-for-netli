import React from 'react';

export default function OrdersPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Track Orders</h2>
          <p className="text-muted-foreground mt-1">Track your order status and shipments</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 p-6">
        {/* Add your order tracking content here */}
      </div>
    </div>
  );
} 