import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';

/**
 * MobileHeader - A mobile-friendly header component
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {function} props.onBack - Back button handler
 * @param {Array} props.actions - Array of action buttons for the menu
 * @param {React.ReactNode} props.children - Additional content
 */
export default function MobileHeader({ 
  title, 
  subtitle, 
  onBack, 
  actions = [], 
  children 
}) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <>
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 sticky top-16 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="mobile-action-btn -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="mobile-text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mobile-text-sm text-gray-500 truncate mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="mobile-action-btn text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    <div className="py-2">
                      {actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.onClick?.();
                            setShowMenu(false);
                          }}
                          className={`w-full text-left mobile-btn-sm justify-start transition-colors duration-200 flex items-center space-x-3 mx-2 ${
                            action.variant === 'danger' 
                              ? 'text-red-700 hover:bg-red-50' 
                              : 'text-gray-700 hover:bg-gray-50'
                          } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={action.disabled}
                        >
                          {action.icon && <action.icon className="h-4 w-4" />}
                          <span className="mobile-text-sm font-medium">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      {/* Backdrop for menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
