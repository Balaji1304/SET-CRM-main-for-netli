'use client';
import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({ packages, onDragEnd }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // A trick to ensure Droppables are registered before we render them
    // to avoid issues with React 18 Strict Mode.
    const timer = setTimeout(() => {
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const columns = {
    'Not Shipped': {
      id: 'Not Shipped',
      title: 'Not Shipped',
      packages: packages.filter((p) => p.status === 'Not Shipped'),
    },
    Shipped: {
      id: 'Shipped',
      title: 'Shipped',
      packages: packages.filter((p) => p.status === 'Shipped'),
    },
    Delivered: {
      id: 'Delivered',
      title: 'Delivered',
      packages: packages.filter((p) => p.status === 'Delivered'),
    },
  };

  if (!ready) {
    return null; // Or a loading spinner
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='flex space-x-4 p-4 bg-gray-100 rounded-lg overflow-x-auto'>
        {Object.values(columns).map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard; 