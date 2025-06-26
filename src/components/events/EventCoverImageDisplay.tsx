import React from 'react';
import { ImageIcon, Calendar } from 'lucide-react';

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

  // Custom placeholder with AfterLife aesthetic
  return (
    <div
      className={`${className} bg-gradient-to-r from-indigo-50 to-blue-50 flex flex-col items-center justify-center`}
      aria-label="No cover image available"
    >
      {placeholderStyle === 'icon' && (
        <>
          <Calendar className="h-16 w-16 text-indigo-300 mb-2" />
          <div className="text-indigo-400 text-sm font-medium">
            {eventName}
          </div>
        </>
      )}
    </div>
  );
};

export default EventCoverImageDisplay;