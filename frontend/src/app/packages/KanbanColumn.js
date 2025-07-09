'use client';
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({ column }) => {
  return (
    <div className='bg-gray-200 p-4 rounded-lg w-80 flex-shrink-0'>
      <h2 className='font-bold text-lg mb-4 text-gray-800 border-b-2 border-gray-300 pb-2'>
        {column.title} ({column.packages.length})
      </h2>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-4 min-h-[500px] transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-gray-200'
            }`}
          >
            {column.packages.map((pkg, index) => (
              <KanbanCard key={pkg._id} pkg={pkg} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn; 