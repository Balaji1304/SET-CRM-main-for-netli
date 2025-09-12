import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  // Prevent background scroll when modal is open
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

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-out">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">{title}</h3>
        <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-200 touch-target"
            style={{ minHeight: '44px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#FF7300] hover:bg-[#FF8800] text-white rounded-lg text-sm font-medium transition-colors duration-200 touch-target"
            style={{ minHeight: '44px' }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
} 