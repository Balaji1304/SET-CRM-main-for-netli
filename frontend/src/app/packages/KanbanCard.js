'use client';
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const KanbanCard = ({ pkg, index }) => {
  return (
    <Draggable draggableId={pkg._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${
            snapshot.isDragging ? 'border-blue-500' : 'border-gray-300'
          }`}
        >
          <h3 className='font-bold text-gray-800'>{pkg.packageNumber}</h3>
          <p className='text-sm text-gray-600'>
            SO: {pkg.salesOrder?.purchaseID}
          </p>
          <p className='text-sm text-gray-600'>
            Customer: {pkg.customer?.firstName} {pkg.customer?.lastName}
          </p>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard; 