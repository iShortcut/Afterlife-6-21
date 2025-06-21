import { Calendar, Download } from 'lucide-react';
import Button from '../ui/Button';

interface AddToCalendarButtonsProps {
  event: {
    title: string;
    description?: string | null;
    start_time: string;
    end_time?: string | null;
    location_text?: string | null;
  };
  className?: string;
}

const AddToCalendarButtons = ({ event, className = '' }: AddToCalendarButtonsProps) => {
  // Format dates for calendar links
  const formatDateForCalendar = (dateString: string) => {
    const date = new Date(dateString);
    
    // Format for Google Calendar (YYYYMMDDTHHMMSSZ)
    const googleFormat = date.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Format for Outlook/ICS (YYYY-MM-DDTHH:MM:SS)
    const outlookFormat = date.toISOString().replace(/\.\d+Z$/, '');
    
    return { googleFormat, outlookFormat };
  };

  // Create Google Calendar URL
  const createGoogleCalendarUrl = () => {
    const { googleFormat: startDate } = formatDateForCalendar(event.start_time);
    const endDate = event.end_time 
      ? formatDateForCalendar(event.end_time).googleFormat 
      : formatDateForCalendar(new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString()).googleFormat; // Default to 1 hour later
    
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: event.description || '',
      location: event.location_text || '',
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Create Outlook Calendar URL
  const createOutlookCalendarUrl = () => {
    const { outlookFormat: startDate } = formatDateForCalendar(event.start_time);
    const endDate = event.end_time 
      ? formatDateForCalendar(event.end_time).outlookFormat 
      : formatDateForCalendar(new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString()).outlookFormat; // Default to 1 hour later
    
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: event.title,
      startdt: startDate,
      enddt: endDate,
      body: event.description || '',
      location: event.location_text || '',
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Create and download ICS file
  const downloadIcsFile = () => {
    const startDate = new Date(event.start_time);
    const endDate = event.end_time 
      ? new Date(event.end_time) 
      : new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour later
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, -1) + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `LOCATION:${event.location_text || ''}`,
      `DESCRIPTION:${event.description?.replace(/\n/g, '\\n') || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(createGoogleCalendarUrl(), '_blank')}
        className="flex items-center gap-1.5"
      >
        <Calendar size={16} />
        <span>Google Calendar</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(createOutlookCalendarUrl(), '_blank')}
        className="flex items-center gap-1.5"
      >
        <Calendar size={16} />
        <span>Outlook Calendar</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={downloadIcsFile}
        className="flex items-center gap-1.5"
      >
        <Download size={16} />
        <span>Download .ics</span>
      </Button>
    </div>
  );
};

export default AddToCalendarButtons;