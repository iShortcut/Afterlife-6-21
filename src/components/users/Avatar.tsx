import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackInitials?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  size = 'md',
  className = '',
  fallbackInitials,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  // Get initials from alt text if fallbackInitials not provided
  const getInitials = () => {
    if (fallbackInitials) return fallbackInitials;
    
    if (alt && alt !== 'User avatar') {
      return alt
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    
    return '';
  };

  // Handle image load error
  const handleError = () => {
    setImageError(true);
  };

  // If src is provided and no error occurred, render the image
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={handleError}
      />
    );
  }

  // Otherwise render a fallback
  const initials = getInitials();

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ${className}`}
      aria-label={alt}
    >
      {initials ? (
        <span className="font-medium">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  );
};

export default Avatar;