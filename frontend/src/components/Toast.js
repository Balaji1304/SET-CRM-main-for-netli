import { X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`rounded-lg shadow-lg p-4 ${
        type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className="flex items-center gap-2">
          <span>{message}</span>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 