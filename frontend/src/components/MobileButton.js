import React from 'react';

/**
 * MobileButton - A mobile-optimized button component with proper touch targets
 * @param {Object} props
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'danger', 'ghost'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.iconPosition - Icon position: 'left', 'right'
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onClick - Click handler
 */
export default function MobileButton({ 
  variant = 'primary', 
  size = 'md',
  children, 
  icon, 
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  ...props 
}) {
  
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 focus:ring-orange-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
    outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'mobile-btn-sm rounded-lg',
    md: 'mobile-btn rounded-lg', 
    lg: 'mobile-btn-lg rounded-xl'
  };
  
  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const textSizeClasses = {
    sm: 'mobile-text-xs',
    md: 'mobile-text-sm', 
    lg: 'mobile-text-base'
  };
  
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  const LoadingSpinner = () => (
    <svg 
      className={`animate-spin ${iconSizeClasses[size]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className={iconSizeClasses[size]}>
          {React.cloneElement(icon, { 
            className: iconSizeClasses[size]
          })}
        </span>
      )}
      
      {children && (
        <span className={textSizeClasses[size]}>
          {children}
        </span>
      )}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className={iconSizeClasses[size]}>
          {React.cloneElement(icon, { 
            className: iconSizeClasses[size]
          })}
        </span>
      )}
    </button>
  );
}

/**
 * MobileIconButton - A mobile-optimized icon-only button
 */
export function MobileIconButton({ 
  variant = 'ghost', 
  size = 'md',
  icon, 
  loading = false,
  disabled = false,
  className = '',
  title,
  onClick,
  ...props 
}) {
  
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 focus:ring-orange-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'mobile-action-btn rounded-lg h-10 w-10',
    md: 'mobile-action-btn rounded-lg',
    lg: 'mobile-action-btn rounded-xl h-12 w-12'
  };
  
  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.ghost}
    ${sizeClasses[size] || sizeClasses.md}
    ${className}
  `.trim();

  const LoadingSpinner = () => (
    <svg 
      className={`animate-spin ${iconSizeClasses[size]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      {...props}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        icon && React.cloneElement(icon, { 
          className: iconSizeClasses[size]
        })
      )}
    </button>
  );
}
