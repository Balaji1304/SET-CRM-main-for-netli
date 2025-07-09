'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import packageService from '../../services/packageService';
import { toast } from 'react-toastify';
import KanbanBoard from './KanbanBoard';
import CreatePackageModal from './CreatePackageModal';
import { PlusCircle } from 'lucide-react';

const PackagesPage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token } = useAuth();

  const fetchPackages = async () => {
    try {
      const data = await packageService.getPackages(token);
      setPackages(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPackages();
    }
  }, [token]);

  const handleCreatePackage = async (salesOrderId) => {
    try {
      await packageService.createPackage(salesOrderId, token);
      toast.success('Package created successfully!');
      setIsModalOpen(false);
      fetchPackages(); // Refresh the package list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create package');
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    // Optimistic UI update
    const originalPackages = [...packages];
    const updatedPackages = packages.map((p) =>
      p._id === draggableId ? { ...p, status: destination.droppableId } : p
    );
    setPackages(updatedPackages);

    try {
      await packageService.updatePackageStatus(
        draggableId,
        destination.droppableId,
        token
      );
      toast.success('Package status updated!');
    } catch (error) {
      setPackages(originalPackages); // Revert on failure
      toast.error('Failed to update package status');
    }
  };

  return (
    <div className='p-4'>
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-3xl font-bold text-gray-800'>Package Tracking</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className='flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700'
        >
          <PlusCircle className='mr-2' size={20} />
          Create Package
        </button>
      </div>

      <CreatePackageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreatePackage={handleCreatePackage}
      />

      {loading ? (
        <p>Loading packages...</p>
      ) : (
        <KanbanBoard packages={packages} onDragEnd={handleDragEnd} />
      )}
    </div>
  );
};

export default PackagesPage; 