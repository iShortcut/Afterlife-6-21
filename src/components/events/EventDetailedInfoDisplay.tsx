import React from 'react';
import { Calendar, Clock, MapPin, Info, List, CheckSquare, AlertCircle, Coffee, Users } from 'lucide-react';

export interface DetailedInfoItem {
  title: string;
  content: string;
  type?: 'heading' | 'paragraph' | 'list_item' | 'warning' | 'note';
  icon?: string;
}

interface EventDetailedInfoDisplayProps {
  detailedInfo?: DetailedInfoItem[];
  className?: string;
}

const EventDetailedInfoDisplay: React.FC<EventDetailedInfoDisplayProps> = ({ 
  detailedInfo = [], 
  className = '' 
}) => {
  // If no detailed info is provided, don't render anything
  if (!detailedInfo || detailedInfo.length === 0) {
    return null;
  }

  // Map icon strings to Lucide React components
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    
    const iconMap: Record<string, React.ReactNode> = {
      'calendar': <Calendar size={18} className="text-indigo-500" />,
      'clock': <Clock size={18} className="text-indigo-500" />,
      'map-pin': <MapPin size={18} className="text-indigo-500" />,
      'info': <Info size={18} className="text-indigo-500" />,
      'list': <List size={18} className="text-indigo-500" />,
      'check': <CheckSquare size={18} className="text-indigo-500" />,
      'alert': <AlertCircle size={18} className="text-amber-500" />,
      'coffee': <Coffee size={18} className="text-indigo-500" />,
      'users': <Users size={18} className="text-indigo-500" />,
      // Add more icon mappings as needed
    };
    
    return iconMap[iconName] || <Info size={18} className="text-indigo-500" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800">Event Details</h2>
      
      <div className="space-y-4">
        {detailedInfo.map((item, index) => {
          // Determine the appropriate component based on the item type
          switch (item.type) {
            case 'heading':
              return (
                <div key={index} className="mt-6 first:mt-0">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {item.icon && getIconComponent(item.icon)}
                    {item.title}
                  </h3>
                  <p className="mt-1 text-gray-600">{item.content}</p>
                </div>
              );
              
            case 'list_item':
              return (
                <div key={index} className="flex items-start gap-2 pl-4">
                  <div className="mt-1 flex-shrink-0">
                    {item.icon ? getIconComponent(item.icon) : <List size={18} className="text-indigo-500" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{item.title}</h4>
                    <p className="text-gray-600">{item.content}</p>
                  </div>
                </div>
              );
              
            case 'warning':
              return (
                <div key={index} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">{item.title}</h4>
                      <p className="text-amber-700">{item.content}</p>
                    </div>
                  </div>
                </div>
              );
              
            case 'note':
              return (
                <div key={index} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
                  <div className="flex items-start gap-2">
                    <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">{item.title}</h4>
                      <p className="text-blue-700">{item.content}</p>
                    </div>
                  </div>
                </div>
              );
              
            case 'paragraph':
            default:
              return (
                <div key={index} className="flex items-start gap-2">
                  {item.icon && <div className="mt-1 flex-shrink-0">{getIconComponent(item.icon)}</div>}
                  <div className={item.icon ? '' : 'w-full'}>
                    {item.title && <h4 className="font-medium text-gray-800">{item.title}</h4>}
                    <p className="text-gray-600 whitespace-pre-wrap">{item.content}</p>
                  </div>
                </div>
              );
          }
        })}
      </div>
    </div>
  );
};

export default EventDetailedInfoDisplay;