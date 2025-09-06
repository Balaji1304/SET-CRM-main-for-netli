import React from 'react';

/**
 * MobileCard - A mobile-friendly card component for displaying data
 * @param {Object} props
 * @param {Array} props.fields - Array of field objects with { label, value, icon?, className? }
 * @param {Array} props.actions - Array of action buttons
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Card subtitle
 * @param {string} props.status - Status indicator
 * @param {function} props.onClick - Click handler for the card
 * @param {string} props.className - Additional CSS classes
 */
export default function MobileCard({ 
  fields = [], 
  actions = [], 
  title, 
  subtitle, 
  status,
  onClick,
  className = "" 
}) {
  return (
    <div 
      className={`mobile-card hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      {(title || subtitle || status) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="mobile-text-base font-semibold text-gray-900 truncate leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mobile-text-sm text-gray-500 mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {status && (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full mobile-text-xs font-medium ml-3 flex-shrink-0 ${getStatusClass(status)}`}>
              {status}
            </span>
          )}
        </div>
      )}

      {/* Fields */}
      {fields.length > 0 && (
        <div className="mobile-space-y-3 mb-4">
          {fields.map((field, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-600 flex-1 min-w-0">
                {field.icon && <field.icon className="h-4 w-4 flex-shrink-0" />}
                <span className="mobile-text-sm font-medium truncate">{field.label}:</span>
              </div>
              <span className={`mobile-text-sm text-gray-900 font-semibold flex-shrink-0 max-w-[55%] text-right truncate ${field.className || ''}`}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick?.();
              }}
              className={`mobile-btn-sm flex items-center gap-1.5 transition-all duration-200 ${
                action.variant === 'primary' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700' 
                  : action.variant === 'danger'
                  ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={action.disabled}
            >
              {action.icon && <action.icon className="h-3.5 w-3.5" />}
              <span className="mobile-text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get status styling
function getStatusClass(status) {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('active') || statusLower.includes('approved') || statusLower.includes('completed')) {
    return 'bg-green-100 text-green-800';
  }
  if (statusLower.includes('pending') || statusLower.includes('in progress')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (statusLower.includes('rejected') || statusLower.includes('cancelled') || statusLower.includes('expired')) {
    return 'bg-red-100 text-red-800';
  }
  if (statusLower.includes('draft')) {
    return 'bg-gray-100 text-gray-800';
  }
  
  return 'bg-blue-100 text-blue-800';
}

