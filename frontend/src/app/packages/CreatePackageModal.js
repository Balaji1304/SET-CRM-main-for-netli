'use client';
import React, { useState, useEffect } from 'react';
import { getApprovedSalesOrders } from '../../services/customerService';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const CreatePackageModal = ({ isOpen, onClose, onCreatePackage }) => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen && token) {
      const fetchSalesOrders = async () => {
        setLoading(true);
        try {
          const response = await getApprovedSalesOrders(token);
          setSalesOrders(response.data);
        } catch (error) {
          toast.error('Failed to fetch sales orders');
        } finally {
          setLoading(false);
        }
      };
      fetchSalesOrders();
    }
  }, [isOpen, token]);

  const handleCreate = () => {
    if (selectedOrder) {
      onCreatePackage(selectedOrder);
    } else {
      toast.error('Please select a sales order to create a package.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white p-6 rounded-lg shadow-xl w-full max-w-md'>
        <h2 className='text-xl font-bold mb-4'>Create a New Package</h2>
        {loading ? (
          <p>Loading available sales orders...</p>
        ) : (
          <>
            <div className='mb-4'>
              <label htmlFor='salesOrder' className='block text-sm font-medium text-gray-700 mb-2'>
                Select a Sales Order
              </label>
              <select
                id='salesOrder'
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className='block w-full p-2 border border-gray-300 rounded-md shadow-sm'
              >
                <option value='' disabled>-- Select an Order --</option>
                {salesOrders.map((order) => (
                  <option key={order._id} value={order._id}>
                    {order.purchaseID} - {order.customerId.firstName} {order.customerId.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex justify-end space-x-2'>
              <button
                onClick={onClose}
                className='bg-gray-300 text-gray-800 px-4 py-2 rounded-md'
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className='bg-blue-600 text-white px-4 py-2 rounded-md'
                disabled={!selectedOrder}
              >
                Create Package
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatePackageModal; 