import React from 'react';
import { ImageIcon } from 'lucide-react';

interface EventCoverImageDisplayProps {
  heroMediaUrl?: string | null;
  heroMediaType?: 'image' | 'video' | 'default' | null;
  eventName?: string; // For alt text
  className?: string; // For additional styling, e.g., height constraints
  placeholderStyle?: 'icon' | 'pattern' | 'none'; // To control placeholder appearance
}

const EventCoverImageDisplay: React.FC<EventCoverImageDisplayProps> = ({
  heroMediaUrl,
  heroMediaType = 'default',
  eventName = "Event",
  className = "w-full h-64 object-cover rounded-lg shadow-md", // Default for a details page banner
  placeholderStyle = 'icon'
}) => {
  if (heroMediaUrl) {
    if (heroMediaType === 'video') {
      return (
        <video
          src={heroMediaUrl}
          controls
          className={className}
          title={`Video for ${eventName}`}
          onError={(e) => (e.currentTarget.style.display = 'none')} // Simple error handling
        />
      );
    } else {
      // Default to image
      return (
        <img
          src={heroMediaUrl}
          alt={`Cover image for ${eventName}`}
          className={className}
          onError={(e) => (e.currentTarget.style.display = 'none')} // Simple error handling
        />
      );
    }
  }

  if (placeholderStyle === 'none') {
    return null;
  }

  // Placeholder (consistent with other placeholders in the app)
  return (
    <div
      className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}
      aria-label="No cover image available"
    >
      {placeholderStyle === 'icon' && (
        <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-500" />
      )}
    </div>
  );
};

export default EventCoverImageDisplay;