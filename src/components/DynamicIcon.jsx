import React, { useState } from 'react';

export const DynamicIcon = ({ 
  value, 
  className = "w-6 h-6", 
  alt = "icon",
  fallback = "💳" 
}) => {
  const [hasError, setHasError] = useState(false);

  if (!value) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{fallback}</span>;
  }

  const isUrl = typeof value === 'string' && (
    value.startsWith('http://') || 
    value.startsWith('https://') || 
    value.startsWith('data:image') ||
    value.startsWith('/')
  );

  if (isUrl && !hasError) {
    return (
      <img
        src={value}
        alt={alt}
        className={`${className} object-contain rounded-md shrink-0`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  if (isUrl && hasError) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{fallback}</span>;
  }

  return <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>{value}</span>;
};

export default DynamicIcon;
