import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  const spinnerClass = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${spinnerClass}`}></div>
      {text && (
        <p className="text-gray-600 text-sm mt-3">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;

